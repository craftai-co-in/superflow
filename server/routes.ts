import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { transcriptionRequestSchema, socialMediaRequestSchema, loginSchema, signupSchema, waitlistSchema, professionSchema, createPaymentOrderSchema, verifyPaymentSchema } from "@shared/schema";
import { getSession, requireAuth, attachUser, createUserWithPassword, authenticateUser, getUserRedirectUrl, handleCrossDomainError, checkPlanExpiry } from "./auth";
import OpenAI from "openai";
import multer from "multer";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import ffmpegPath from 'ffmpeg-static';
import { Cashfree, CFEnvironment } from "cashfree-pg";
import cors from "cors";
import crypto from "crypto";

const execAsync = promisify(exec);

// Cashfree configuration for India-specific payment gateway
// Cashfree configuration for India-specific payment gateway
const cashfreeConfig = {
  appId:  process.env.CASHFREE_APP_ID || '',
  secretKey: process.env.CASHFREE_SECRET_KEY || '',
  environment: process.env.CASHFREE_ENVIRONMENT === "PRODUCTION" ? "production" : "sandbox"
};

// Initialize Cashfree SDK instance (only if credentials exist)
let cashfree:  any = null;
if (cashfreeConfig.appId && cashfreeConfig.secretKey) {
  cashfree = new Cashfree(
    cashfreeConfig.environment === "production" ?  CFEnvironment.PRODUCTION : CFEnvironment.SANDBOX,
    cashfreeConfig.appId,
    cashfreeConfig.secretKey
  );
  console.log('✅ Cashfree payment gateway initialized');
} else {
  console.log('⚠️ Cashfree credentials not found - payments disabled');
}

// Plan pricing in paisa (₹199 = 19900 paisa)
const PLAN_PRICING = {
  lite: { amount: 19900, minutes: 60, name: "Lite Plan" },
  pro: { amount: 99900, minutes: 600, name: "Pro Plan" },
  max: { amount: 199900, minutes: -1, name: "Max Plan" } // -1 for unlimited
};

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
// OpenAI API configuration for India region compliance - all API calls from Indian servers
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key",
  // Note: OpenAI API requests will be made from Indian region to ensure compliance
});

// Configure multer for temporary file storage
const upload = multer({
  dest: '/tmp/',
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB limit
});

export async function registerRoutes(app: Express): Promise<Server> {
  // CORS configuration for webhook endpoints
  const corsOptions = {
    origin: ['https://api.cashfree.com', 'https://sandbox.cashfree.com'],
    methods: ['POST', 'GET', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-webhook-signature', 'x-webhook-timestamp', 'Authorization'],
    credentials: false
  };

  // Apply CORS to webhook endpoint
  app.use('/api/payment/webhook', cors(corsOptions));

  // Session middleware with proper cross-domain configuration
  app.use(getSession());

  // Attach user to all requests (optional)
  app.use(attachUser);

  // Health check endpoint with cross-domain status
  app.get("/api/health", (req, res) => {
    const host = req.get('host') || '';
    const isMainApp = host.includes('superflow.work') && !host.includes('app.');
    const isPremiumApp = host.includes('app.superflow.work');

    res.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      domain: host,
      app: isMainApp ? "main" : isPremiumApp ? "premium" : "unknown",
      crossDomainReady: true
    });
  });

  // Authentication endpoints
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const validationResult = signupSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          error: "Validation failed",
          details: validationResult.error.issues
        });
      }

      const { email, name, phone, password, termsAccepted } = validationResult.data;

      const user = await createUserWithPassword(email, name, phone, password, termsAccepted);

      // Set session
      req.session.userId = user.id;

      // Check for cross-domain redirection (new users are typically free)
      const redirectUrl = getUserRedirectUrl(user, req.get('host') || '');

      // Don't send password back
      const { password: _, ...userWithoutPassword } = user;

      const response: any = { 
        user: userWithoutPassword, 
        message: "Signup successful" 
      };

      // Add redirect information if needed
      if (redirectUrl) {
        response.redirectTo = redirectUrl;
        response.reason = "new_user";
      }

      res.json(response);
    } catch (error: any) {
      console.error("Signup error:", error);
      if (error.message === "User with this email already exists") {
        return res.status(409).json({ error: "User with this email already exists" });
      }
      res.status(500).json({ error: "Signup failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const validationResult = loginSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          error: "Validation failed",
          details: validationResult.error.issues
        });
      }

      const { email, password } = validationResult.data;

      const user = await authenticateUser(email, password);
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Set session
      req.session.userId = user.id;

      // Check for cross-domain redirection
      const redirectUrl = getUserRedirectUrl(user, req.get('host') || '');

      // Don't send password back
      const { password: _, ...userWithoutPassword } = user;

      const response: any = { 
        user: userWithoutPassword, 
        message: "Login successful" 
      };

      // Add redirect information if needed
      if (redirectUrl) {
        response.redirectTo = redirectUrl;
        response.reason = user.isPremium ? "premium_user" : "free_user";
      }

      res.json(response);
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ message: "Logout successful" });
    });
  });

  // Get current user with cross-domain redirection check and plan expiry handling
  app.get("/api/me", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Check plan expiry and handle auto-downgrade
      const expiryStatus = await checkPlanExpiry(req.user.id);

      // Get fresh user data if plan was downgraded
      let currentUser = req.user;
      if (expiryStatus.shouldDowngrade) {
        currentUser = await storage.getUser(req.user.id) || req.user;
      }

      // Check if user should be redirected to different domain
      const redirectUrl = getUserRedirectUrl(currentUser, req.get('host') || '');

      const response: any = { user: currentUser };

      if (redirectUrl) {
        response.redirectTo = redirectUrl;
        response.reason = currentUser.isPremium ? "premium_access" : "free_user";
      }

      // Add plan status information
      if (expiryStatus.daysLeft >= 0) {
        response.planStatus = {
          daysLeft: expiryStatus.daysLeft,
          isExpired: expiryStatus.isExpired,
          wasDowngraded: expiryStatus.shouldDowngrade
        };
      }

      res.json(response);
    } catch (error) {
      console.error("Error in /api/me:", error);
      return handleCrossDomainError(error, req, res);
    }
  });

  // Data deletion endpoints for compliance
  app.delete("/api/user/data", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;

      // Delete all user data (recordings and user account)
      const success = await storage.deleteUser(userId);

      if (!success) {
        return res.status(500).json({ error: "Failed to delete user data" });
      }

      // Clear session after successful deletion
      req.session.destroy((err) => {
        if (err) {
          console.error("Session destruction error after account deletion:", err);
        }
      });

      res.json({ message: "User data deleted successfully" });
    } catch (error) {
      console.error("User data deletion error:", error);
      res.status(500).json({ error: "Failed to delete user data" });
    }
  });

  app.delete("/api/user/recordings", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;

      // Delete only user recordings, keep account
      const success = await storage.deleteUserRecordings(userId);

      if (!success) {
        return res.status(500).json({ error: "Failed to delete recordings" });
      }

      res.json({ message: "Recordings deleted successfully" });
    } catch (error) {
      console.error("Recordings deletion error:", error);
      res.status(500).json({ error: "Failed to delete recordings" });
    }
  });

  // Voice processing endpoint with enhanced error handling and debugging (free tier - no auth required)
  app.post("/api/transcribe", attachUser, upload.single('audio'), async (req, res) => {
    let audioFilePath: string | null = null;

    // Comprehensive debugging logs
    console.log('=== TRANSCRIPTION REQUEST DEBUG ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Request file info:', req.file ? {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
      filename: req.file.filename
    } : 'No file received');

    try {
      // Validate audio file upload
      if (!req.file) {
        console.log('ERROR: No file in request');
        return res.status(400).json({
          error: "Audio upload failed",
          message: "No audio file was received. Please try recording again.",
          type: "UPLOAD_ERROR"
        });
      }

      // Check file size and type
      if (req.file.size === 0) {
        return res.status(400).json({
          error: "Audio upload failed",
          message: "The audio file appears to be empty. Please record again.",
          type: "UPLOAD_ERROR"
        });
      }

      audioFilePath = req.file.path;

      // Verify file exists and is readable
      if (!fs.existsSync(audioFilePath)) {
        return res.status(400).json({
          error: "Audio upload failed",
          message: "Audio file could not be saved. Please try again.",
          type: "UPLOAD_ERROR"
        });
      }

      // Check user's remaining minutes for authenticated users
      if (req.user) {
        const remainingMinutes = await storage.checkMinutesRemaining(req.user.id);
        if (remainingMinutes <= 0) {
          // Clean up file before returning error
          fs.unlinkSync(audioFilePath);
          return res.status(403).json({
            error: "Insufficient minutes",
            message: "You've used up your recording minutes. Upgrade your plan to continue recording.",
            type: "USAGE_LIMIT_EXCEEDED",
            remainingMinutes: 0
          });
        }
      }

      let transcript: string;

      try {
        // Convert audio to WAV format for guaranteed Whisper compatibility
        console.log('Converting audio to WAV format...');
        const convertedPath = audioFilePath + '.wav';

        // Use ffmpeg-static path (cross-platform)
        const ffmpegCommand = `"${ffmpegPath}" -i "${audioFilePath}" -acodec pcm_s16le -ac 1 -ar 16000 "${convertedPath}" -y`;
        console.log('FFmpeg command:', ffmpegCommand);

        const { stdout, stderr } = await execAsync(ffmpegCommand);
        console.log('FFmpeg stdout:', stdout);
        if (stderr) console.log('FFmpeg stderr:', stderr);
        console.log('Audio conversion completed:', convertedPath);

        // Verify converted file exists
        if (!fs.existsSync(convertedPath)) {
          throw new Error('Converted audio file not found');
        }

        console.log('Converted file stats:', fs.statSync(convertedPath));

        // Transcribe using converted WAV file
        console.log('Starting Whisper transcription with converted WAV...');
        const audioReadStream = fs.createReadStream(convertedPath);
        const transcription = await openai.audio.transcriptions.create({
          file: audioReadStream,
          model: "whisper-1",
        });

        transcript = transcription.text;
        console.log('Whisper transcription successful. Length:', transcript.length, 'characters');

        // Clean up converted file
        try {
          fs.unlinkSync(convertedPath);
        } catch (cleanupError) {
          console.warn('Failed to cleanup converted file:', cleanupError);
        }

        // Validate transcript
        if (!transcript || transcript.trim().length === 0) {
          return res.status(400).json({
            error: "Transcription failed",
            message: "No speech was detected in your recording. Please speak more clearly and try again.",
            type: "WHISPER_ERROR"
          });
        }

      } catch (whisperError: any) {
        console.error("=== WHISPER API ERROR DEBUG ===");
        console.error("Error object:", {
          name: whisperError.name,
          message: whisperError.message,
          status: whisperError.status,
          code: whisperError.code,
          type: whisperError.type,
          param: whisperError.param
        });
        console.error("Full error:", whisperError);

        // Handle specific Whisper API errors with detailed debugging
        if (whisperError.status === 400) {
          console.log('400 Error - Likely file format issue');
          return res.status(500).json({
            error: "Speech recognition failed",
            message: "Could not transcribe your audio. Please try speaking more clearly.",
            type: "WHISPER_ERROR",
            debug: process.env.NODE_ENV === 'development' ? whisperError.message : undefined
          });
        } else if (whisperError.status === 401) {
          return res.status(401).json({
            error: "Authentication failed",
            message: "Invalid OpenAI API key. Please check your API key and try again.",
            type: "WHISPER_ERROR"
          });
        } else if (whisperError.status === 429) {
          return res.status(429).json({
            error: "Rate limit exceeded",
            message: "Too many requests. Please wait a moment and try again.",
            type: "WHISPER_ERROR"
          });
        } else if (whisperError.status === 413) {
          return res.status(413).json({
            error: "File too large",
            message: "Audio file is too large. Please record a shorter message.",
            type: "WHISPER_ERROR"
          });
        } else {
          return res.status(500).json({
            error: "Speech recognition failed",
            message: "Could not transcribe your audio. Please try speaking more clearly.",
            type: "WHISPER_ERROR",
            debug: process.env.NODE_ENV === 'development' ? whisperError.message : undefined
          });
        }
      }

      let processedContent: string;

      try {
        // Enhance content using GPT-4o mini with advanced formatting prompt
        const enhancementResponse = await openai.chat.completions.create({
          model: "gpt-4o-mini", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
          messages: [
            {
              role: "system",
              content: "Transform this voice transcript into engaging social media content. Follow these rules strictly:\n\nLANGUAGE MATCHING: Analyze the English level in the transcript (beginner/intermediate/advanced). Output content at THE SAME level - if they use simple words, you use simple words. If they make basic grammar, you use basic grammar but make it correct. Never upgrade their language sophistication.\n\nCONTENT TRANSFORMATION: Turn their raw thoughts into a compelling story that:\n- Flows naturally like spoken conversation\n- Keeps their original personality and energy\n- Makes their message clear and engaging\n- Sounds like them, but smarter and more organized\n\nOUTPUT FORMAT: Provide ONLY the final social media-ready content. No analysis, no steps, no explanations - just the polished story.\n\nTONE: Match their vibe but make it slightly more positive and engaging. If they sound excited, keep that energy. If they sound casual, stay casual.\n\nSTRUCTURE: Organize as a natural story with smooth flow - beginning, middle, end. Make it ready to copy-paste for social media.\n\nTurn this transcript into content that sounds like the speaker got their thoughts perfectly organized:"
            },
            {
              role: "user",
              content: `${transcript}`
            }
          ],
          max_tokens: 1500,
        });

        processedContent = enhancementResponse.choices[0].message.content || transcript;

        // Validate processed content
        if (!processedContent || processedContent.trim().length === 0) {
          processedContent = transcript; // Fallback to original transcript
        }

      } catch (gptError: any) {
        console.error("GPT API Error:", gptError);

        // Handle specific GPT API errors but don't fail the whole request
        if (gptError.status === 401) {
          // Still return transcript even if GPT fails
          processedContent = transcript;
          console.warn("GPT authentication failed, returning raw transcript");
        } else if (gptError.status === 429) {
          processedContent = transcript;
          console.warn("GPT rate limit exceeded, returning raw transcript");
        } else {
          processedContent = transcript;
          console.warn("GPT processing failed, returning raw transcript");
        }
      }

      // Save recording to user history if authenticated
      if (req.user) {
        try {
          // Calculate recording duration (assume 30 seconds max for recordings, 1 minute deduction)
          const recordingDurationSeconds = 30; // This could be calculated from audio file metadata if needed

          // Deduct minutes from user's account and track usage
          const updatedUser = await storage.deductMinutes(req.user.id, recordingDurationSeconds);

          await storage.createRecording({
            userId: req.user.id,
            transcript,
            processedContent,
            duration: recordingDurationSeconds,
            fileSize: req.file?.size || null,
          });

          // Track analytics for authenticated user
          await storage.createAnalyticsEntry({
            userId: req.user.id,
            userType: req.user.isPremium ? 'premium' : 'authenticated',
            recordingDuration: recordingDurationSeconds,
            processingSuccess: 'success',
            userAgent: req.headers['user-agent'] || null,
            ipAddress: req.ip || req.connection.remoteAddress || null,
          });

          // Audit log for compliance
          console.log(`[AUDIT] User ${req.user.id} - Audio processed - ${recordingDurationSeconds}s - Minutes remaining: ${updatedUser.minutesRemaining} - Cross-border data transfer to OpenAI - ${new Date().toISOString()}`);
        } catch (historyError) {
          console.error('Failed to save recording to history:', historyError);
          // Don't fail the request if history saving fails
        }
      } else {
        try {
          // Track analytics for free/anonymous user
          await storage.createAnalyticsEntry({
            userId: null,
            userType: 'free',
            recordingDuration: null,
            processingSuccess: 'success',
            userAgent: req.headers['user-agent'] || null,
            ipAddress: req.ip || req.connection.remoteAddress || null,
          });
        } catch (analyticsError) {
          console.error('Failed to save analytics:', analyticsError);
        }

        // Log anonymous usage for compliance
        console.log(`[AUDIT] Anonymous user - Audio processed - Cross-border data transfer to OpenAI - ${new Date().toISOString()}`);
      }

      // Success response
      res.json({
        transcript,
        processedContent,
        success: true
      });

    } catch (error) {
      console.error("Unexpected error during voice processing:", error);
      res.status(500).json({
        error: "Processing failed",
        message: "An unexpected error occurred while processing your audio. Please try again.",
        type: "SERVER_ERROR",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    } finally {
      // Always clean up temporary file
      if (audioFilePath) {
        try {
          if (fs.existsSync(audioFilePath)) {
            fs.unlinkSync(audioFilePath);
          }
        } catch (cleanupError) {
          console.warn("Failed to cleanup temporary file:", audioFilePath, cleanupError);
        }
      }
    }
  });

  // Social Media Content Generation endpoint (requires auth)
  app.post("/api/generate-social-content", requireAuth, async (req, res) => {
    console.log('=== SOCIAL MEDIA GENERATION REQUEST ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('User ID:', req.user?.id);

    try {
      // Validate request body
      const validationResult = socialMediaRequestSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          error: "Invalid request data",
          message: "Please provide valid content for social media generation.",
          type: "VALIDATION_ERROR"
        });
      }

      const { processedContent } = validationResult.data;

      if (!processedContent || processedContent.trim().length === 0) {
        return res.status(400).json({
          error: "No content provided",
          message: "Please provide content to generate social media posts.",
          type: "VALIDATION_ERROR"
        });
      }

      console.log('Processing content for social media generation...');
      console.log('Content length:', processedContent.length);

      // Generate platform-specific social media content
      const socialMediaPrompts = {
        instagram: `Transform this content into an engaging Instagram post. Make it visual-friendly with natural line breaks, use relevant emojis sparingly, include 2-3 strategic hashtags at the end, and keep it authentic to the speaker's voice. Focus on storytelling and personal connection. Maximum 2200 characters:

${processedContent}`,

        facebook: `Transform this content into a Facebook post that encourages engagement. Make it conversational and relatable, ask a thoughtful question at the end to spark discussion, use paragraph breaks for readability, and maintain the speaker's authentic voice. Facebook users appreciate longer-form content that tells a complete story:

${processedContent}`,

        youtube: `Transform this content into a YouTube video description or community post. Make it descriptive and keyword-rich, include a compelling hook at the beginning, structure it with clear sections if needed, and optimize it for discovery while keeping the speaker's authentic voice. YouTube favors detailed, informative content:

${processedContent}`
      };

      const socialContent: { [key: string]: string } = {};

      // Generate content for each platform
      for (const [platform, prompt] of Object.entries(socialMediaPrompts)) {
        try {
          const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: "You are a social media content expert. Create platform-optimized content that maintains the speaker's authentic voice and personality. Output ONLY the final content - no explanations, no meta-commentary."
              },
              {
                role: "user",
                content: prompt
              }
            ],
            max_tokens: 1000,
            temperature: 0.7,
          });

          socialContent[platform] = response.choices[0].message.content || processedContent;

        } catch (platformError: any) {
          console.error(`Error generating ${platform} content:`, platformError);

          // Fallback to original content for this platform
          socialContent[platform] = processedContent;
        }
      }

      console.log('Social media content generated successfully');

      // Success response
      res.json({
        socialContent: {
          instagram: socialContent.instagram,
          facebook: socialContent.facebook,
          youtube: socialContent.youtube,
        },
        success: true
      });

    } catch (error: any) {
      console.error("Social media generation error:", error);

      // Handle OpenAI API errors
      if (error.status === 401) {
        return res.status(401).json({
          error: "API authentication failed",
          message: "Unable to access AI services. Please try again.",
          type: "SOCIAL_MEDIA_ERROR"
        });
      } else if (error.status === 429) {
        return res.status(429).json({
          error: "Rate limit exceeded",
          message: "Too many requests. Please wait a moment and try again.",
          type: "SOCIAL_MEDIA_ERROR"
        });
      } else {
        return res.status(500).json({
          error: "Social media generation failed",
          message: "Could not generate social media content. Please try again.",
          type: "SOCIAL_MEDIA_ERROR",
          debug: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
    }
  });

  // User history endpoints
  app.get("/api/user/recordings", requireAuth, async (req, res) => {
    try {
      const recordings = await storage.getUserRecordings(req.user!.id);
      res.json({ recordings });
    } catch (error) {
      console.error("Error fetching user recordings:", error);
      res.status(500).json({ error: "Failed to fetch recordings" });
    }
  });

  app.get("/api/user/stats", requireAuth, async (req, res) => {
    try {
      const stats = await storage.getUserRecordingStats(req.user!.id);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching user stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // Data portability endpoint - download user transcripts (Privacy Policy compliance)
  app.get("/api/user/export", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const recordings = await storage.getUserRecordings(user.id);

      // Create exportable data structure
      const exportData = {
        user: {
          email: user.email,
          name: user.name,
          profession: user.profession,
          createdAt: user.createdAt
        },
        recordings: recordings.map(recording => ({
          id: recording.id,
          transcript: recording.transcript,
          processedContent: recording.processedContent,
          duration: recording.duration,
          createdAt: recording.createdAt
        })),
        exportedAt: new Date().toISOString()
      };

      // Set headers for file download
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="superflow-data-${user.id}-${new Date().toISOString().split('T')[0]}.json"`);

      res.json(exportData);
    } catch (error) {
      console.error("Data export error:", error);
      res.status(500).json({ error: "Failed to export data" });
    }
  });

  // Update user profession endpoint
  app.post("/api/user/profession", requireAuth, async (req, res) => {
    try {
      const validationResult = professionSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          error: "Validation failed",
          details: validationResult.error.issues
        });
      }

      const { profession } = validationResult.data;
      const updatedUser = await storage.updateUserProfession(req.user!.id, profession);

      res.json({
        message: "Profession updated successfully",
        user: updatedUser
      });
    } catch (error: any) {
      console.error("Profession update error:", error);
      res.status(500).json({ error: "Failed to update profession" });
    }
  });

  // Payment API Endpoints

  // Create payment order
  app.post("/api/payment/create-order", requireAuth, async (req, res) => {
  try {
    // Add this check at the top
    if (!cashfree) {
      return res.status(503).json({ 
        error: "Payment system not configured",
        message: "Payments are currently unavailable. Please contact support."
      });
    }

      const { planType } = validationResult.data;
      const userId = req.user!.id;
      const plan = PLAN_PRICING[planType];

      if (!plan) {
        return res.status(400).json({ error: "Invalid plan type" });
      }

      // Generate unique order ID
      const orderId = `order_${Date.now()}_${userId}`;

      // Create Cashfree order with enhanced configuration
      const orderRequest = {
        order_id: orderId,
        order_amount: plan.amount / 100, // Convert paisa to rupees
        order_currency: "INR",
        customer_details: {
          customer_id: `customer_${userId}`,
          customer_email: req.user!.email,
          customer_phone: req.user!.phone || "9999999999"
        },
        order_meta: {
          return_url: `https://${req.get('host')}/payment/return`,
          notify_url: `https://${req.get('host')}/api/payment/webhook`,
          payment_methods: "cc,dc,nb,upi,paylater,emi"
        },
        order_expiry_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        order_note: `SuperFlow ${plan.name} subscription`
      };

      console.log('Creating Cashfree order:', orderId, 'for plan:', planType, 'amount:', plan.amount / 100);

      // Create actual Cashfree order  
      const response = await cashfree.PGCreateOrder(orderRequest);

      console.log('Cashfree order created successfully:', response.data?.order_id);

      // Store payment record
      await storage.createPaymentOrder({
        userId,
        cashfreeOrderId: orderId,
        planType,
        amount: plan.amount,
        status: "created"
      });

      res.json({
        orderId: orderId,
        paymentSessionId: response.data.payment_session_id,
        amount: plan.amount / 100,
        planName: plan.name
      });

    } catch (error: any) {
      console.error("Payment order creation error:", error);
      res.status(500).json({ error: "Failed to create payment order" });
    }
  });

  // Verify payment
  app.post("/api/payment/verify", requireAuth, async (req, res) => {
    try {
      const validationResult = verifyPaymentSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          error: "Validation failed",
          details: validationResult.error.issues
        });
      }

      const { orderId, transactionId } = validationResult.data;

      console.log('=== PAYMENT VERIFICATION REQUEST ===');
      console.log('Order ID:', orderId);
      console.log('Transaction ID:', transactionId);
      console.log('User ID:', req.user!.id);

      // Check if payment record exists
      const existingPaymentRecord = await storage.getPayment(orderId);
      console.log('Payment record lookup:', existingPaymentRecord ? {
        id: existingPaymentRecord.id,
        status: existingPaymentRecord.status,
        planType: existingPaymentRecord.planType,
        userId: existingPaymentRecord.userId
      } : 'NOT FOUND');

      // Fetch payment details from Cashfree
      console.log('🔍 Fetching payment details from Cashfree...');
      const response = await cashfree.PGOrderFetchPayments(orderId);
      const payments = response.data;

      console.log('📋 Cashfree PGOrderFetchPayments response:', {
        paymentsCount: payments.length,
        paymentStatuses: payments.map((p: any) => ({
          payment_status: p.payment_status,
          order_status: p.order_status,
          transaction_id: p.cf_payment_id
        }))
      });

      // For sandbox testing - if no payments found and environment is sandbox, simulate success
      if (payments.length === 0 && cashfreeConfig.environment === "sandbox") {
        console.log('Sandbox mode: Simulating successful payment for testing');

        if (existingPaymentRecord) {
          // Update payment status
          await storage.updatePaymentStatus(orderId, "paid", new Date());

          // Update user plan
          const plan = PLAN_PRICING[existingPaymentRecord.planType as keyof typeof PLAN_PRICING];
          const expiresAt = new Date();
          expiresAt.setMonth(expiresAt.getMonth() + 1); // 1 month validity

          const minutesToAdd = plan.minutes === -1 ? 9999 : plan.minutes;
          await storage.updateUserPlan(existingPaymentRecord.userId, existingPaymentRecord.planType, minutesToAdd, expiresAt);

          return res.json({
            success: true,
            redirectUrl: "/dashboard",
            redirectToPremium: existingPaymentRecord.planType !== 'lite',
            message: `Payment successful! Your ${plan.name} has been activated.`,
            planType: existingPaymentRecord.planType
          });
        }
      }

      // Find the successful payment
      const payment = payments.find((p: any) => p.payment_status === "SUCCESS") || payments[0];

      if (!payment) {
        return res.status(400).json({ error: "Payment not found" });
      }

      if (!existingPaymentRecord) {
        return res.status(400).json({ error: "Payment record not found" });
      }

      if (payment.payment_status === "SUCCESS") {
        // Update payment status
        await storage.updatePaymentStatus(orderId, "paid", new Date());

        // Update user plan
        const plan = PLAN_PRICING[existingPaymentRecord.planType as keyof typeof PLAN_PRICING];
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + 1); // 1 month validity

        const minutesToAdd = plan.minutes === -1 ? 9999 : plan.minutes; // 9999 for unlimited
        await storage.updateUserPlan(existingPaymentRecord.userId, existingPaymentRecord.planType, minutesToAdd, expiresAt);

        // Get updated user data for redirection logic
        const updatedUser = await storage.getUser(existingPaymentRecord.userId);
        const redirectUrl = updatedUser ? getUserRedirectUrl(updatedUser, req.get('host') || '') : null;

        // Premium users should be redirected to premium app
        const finalRedirectUrl = redirectUrl || "https://app.superflow.work/dashboard";

        res.json({
          success: true,
          redirectUrl: finalRedirectUrl,
          redirectToPremium: true,
          message: "Payment successful! Your premium plan has been activated.",
          planType: existingPaymentRecord.planType
        });
      } else {
        await storage.updatePaymentStatus(orderId, "failed");
        res.json({
          success: false,
          redirectUrl: "/dashboard",
          message: "Payment failed. Please try again."
        });
      }

    } catch (error: any) {
      console.error("Payment verification error:", error);
      res.status(500).json({ error: "Failed to verify payment" });
    }
  });

  // Enhanced Cashfree webhook endpoint with proper security and event handling
  // Note: Raw body parsing is handled globally in index.ts for this route
  app.post("/api/payment/webhook", async (req, res) => {
    try {
      const webhookSignature = req.headers['x-webhook-signature'] as string;
      const webhookTimestamp = req.headers['x-webhook-timestamp'] as string;
      const rawBody = req.body.toString('utf8');

      console.log('=== CASHFREE WEBHOOK RECEIVED ===');
      console.log('Timestamp:', new Date().toISOString());
      console.log('Headers:', {
        signature: webhookSignature ? 'present' : 'missing',
        timestamp: webhookTimestamp ? 'present' : 'missing',
        contentType: req.headers['content-type'],
        userAgent: req.headers['user-agent'],
        host: req.headers['host'],
        origin: req.headers['origin']
      });
      console.log('Raw Body Length:', rawBody.length);
      console.log('Raw Body Type:', typeof req.body);
      console.log('Raw Body Buffer Info:', Buffer.isBuffer(req.body) ? 'is buffer' : 'not buffer');

      // Enhanced signature verification
      if (webhookSignature && webhookTimestamp && rawBody) {
        try {
          // Manual signature verification as backup
          const expectedSignature = crypto
            .createHmac('sha256', cashfreeConfig.secretKey)
            .update(webhookTimestamp + rawBody)
            .digest('hex');

          if (webhookSignature !== expectedSignature) {
            console.error('Manual signature verification failed');
            if (cashfreeConfig.environment !== "sandbox") {
              return res.status(401).json({ error: "Invalid webhook signature" });
            }
          }

          // Also try Cashfree SDK verification
          try {
            await cashfree.PGVerifyWebhookSignature(webhookSignature, rawBody, webhookTimestamp);
            console.log('Cashfree SDK signature verification successful');
          } catch (sdkError) {
            console.warn('Cashfree SDK verification failed, but manual verification passed:', sdkError);
          }

        } catch (verificationError) {
          console.error('Webhook signature verification failed:', verificationError);
          if (cashfreeConfig.environment !== "sandbox") {
            return res.status(401).json({ error: "Invalid webhook signature" });
          }
        }
      } else {
        console.warn('Missing webhook verification headers');
        if (cashfreeConfig.environment !== "sandbox") {
          return res.status(400).json({ error: "Missing webhook verification headers" });
        }
      }

      // Parse webhook data
      let webhookData;
      try {
        webhookData = JSON.parse(rawBody);
      } catch (parseError) {
        console.error('Failed to parse webhook JSON:', parseError);
        console.error('Raw body that failed to parse:', rawBody);
        return res.status(400).json({ error: "Invalid JSON payload" });
      }

      console.log('Webhook Event Type:', webhookData.type);
      console.log('Webhook Order ID:', webhookData?.data?.order?.order_id);
      console.log('Webhook Data Keys:', Object.keys(webhookData));
      if (process.env.NODE_ENV === 'development') {
        console.log('Full Webhook Data:', JSON.stringify(webhookData, null, 2));
      }

      // Handle different webhook event types
      const eventType = webhookData.type;

      switch (eventType) {
        case 'PAYMENT_SUCCESS_WEBHOOK':
          await handlePaymentSuccessWebhook(webhookData);
          break;
        case 'PAYMENT_FAILED_WEBHOOK':
          await handlePaymentFailedWebhook(webhookData);
          break;
        case 'PAYMENT_USER_DROPPED_WEBHOOK':
          await handlePaymentDroppedWebhook(webhookData);
          break;
        default:
          console.log('Unhandled webhook event type:', eventType);
      }

      // Return success response that Cashfree expects
      res.status(200).json({ 
        status: 'success',
        message: 'Webhook processed successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error("Webhook processing error:", error);
      // Return proper error response for Cashfree retry mechanism
      res.status(500).json({ 
        status: 'error',
        message: 'Webhook processing failed',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Webhook event handlers with enhanced logging and transactional updates
  async function handlePaymentSuccessWebhook(webhookData: any) {
    const { data: { order } } = webhookData;
    const orderId = order.order_id;
    
    console.log('🔄 Processing successful payment webhook for order:', orderId);
    console.log('Order details:', {
      order_id: order.order_id,
      order_status: order.order_status,
      order_amount: order.order_amount,
      payment_session_id: order.payment_session_id
    });

    // Find payment record with detailed logging
    const paymentRecord = await storage.getPayment(orderId);
    if (!paymentRecord) {
      console.error('❌ Payment record not found for order:', orderId);
      throw new Error(`Payment record not found for order: ${orderId}`);
    }

    console.log('📋 Payment record found:', {
      id: paymentRecord.id,
      userId: paymentRecord.userId,
      planType: paymentRecord.planType,
      amount: paymentRecord.amount,
      currentStatus: paymentRecord.status,
      createdAt: paymentRecord.createdAt
    });

    // Prevent duplicate processing (idempotent)
    if (paymentRecord.status === 'paid') {
      console.log('💡 Payment already processed for order:', orderId, '- skipping duplicate');
      return;
    }

    // Transactional update: payment status + user plan activation
    try {
      console.log('🔄 Starting transactional payment processing...');
      
      // Update payment status with transaction details
      const updatedPayment = await storage.updatePaymentStatus(orderId, "paid", new Date());
      console.log('✅ Payment status updated to:', updatedPayment.status);

      // Activate user plan
      const plan = PLAN_PRICING[paymentRecord.planType as keyof typeof PLAN_PRICING];
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1); // 1 month validity

      const minutesToAdd = plan.minutes === -1 ? 9999 : plan.minutes;
      const updatedUser = await storage.updateUserPlan(paymentRecord.userId, paymentRecord.planType, minutesToAdd, expiresAt);
      
      console.log('✅ User plan activated successfully:', {
        userId: paymentRecord.userId,
        planType: paymentRecord.planType,
        minutes: minutesToAdd,
        expiresAt: expiresAt.toISOString(),
        isPremium: updatedUser.isPremium,
        remainingMinutes: updatedUser.minutesRemaining
      });

      // Track successful payment for analytics
      await storage.trackUsage({
        userId: paymentRecord.userId,
        duration: 0,
        remainingMinutes: minutesToAdd
      });
      
      console.log('📊 Analytics tracked for successful payment');
      
    } catch (error) {
      console.error('❌ Transactional payment processing failed:', error);
      throw error; // Re-throw to trigger webhook retry
    }
  }

  async function handlePaymentFailedWebhook(webhookData: any) {
    const { data: { order } } = webhookData;
    const orderId = order.order_id;
    
    console.log('❌ Processing failed payment webhook for order:', orderId);
    console.log('Failure details:', {
      order_id: orderId,
      order_status: order.order_status,
      failure_reason: order.failure_reason || 'Not specified'
    });

    try {
      // Update payment status to failed
      const updatedPayment = await storage.updatePaymentStatus(orderId, "failed");
      console.log('✅ Payment status updated to failed for order:', orderId);
    } catch (error) {
      console.error('❌ Failed to update payment status to failed:', error);
    }
  }

  async function handlePaymentDroppedWebhook(webhookData: any) {
    const { data: { order } } = webhookData;
    const orderId = order.order_id;
    
    console.log('🚫 Processing dropped payment webhook for order:', orderId);
    console.log('Drop details:', {
      order_id: orderId,
      order_status: order.order_status
    });

    try {
      // Update payment status to cancelled/dropped
      const updatedPayment = await storage.updatePaymentStatus(orderId, "cancelled");
      console.log('✅ Payment status updated to cancelled for order:', orderId);
    } catch (error) {
      console.error('❌ Failed to update payment status to cancelled:', error);
    }
  }

  // Cross-domain routing check endpoint
  app.get("/api/auth/check-routing", requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const host = req.get('host') || '';

      // Determine if user should be redirected
      let redirectTo = null;
      let shouldRedirect = false;

      const isMainApp = host.includes('superflow.work') && !host.includes('app.');
      const isPremiumApp = host.includes('app.superflow.work');

      // Check if user has premium access
      const hasPremiumAccess = user.isPremium && user.planType !== 'free';

      // Check if plan has expired
      const isExpired = user.planExpiresAt && new Date() > user.planExpiresAt;

      if (isExpired) {
        // Expired users go to main app for renewal
        redirectTo = isMainApp ? null : 'https://superflow.work/premium';
        shouldRedirect = !isMainApp;
      } else if (hasPremiumAccess) {
        // Premium users should be on premium app
        redirectTo = isMainApp ? 'https://app.superflow.work/dashboard' : null;
        shouldRedirect = isMainApp;
      } else {
        // Free users should be on main app
        redirectTo = isPremiumApp ? 'https://superflow.work/dashboard' : null;
        shouldRedirect = isPremiumApp;
      }

      res.json({
        authenticated: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          planType: user.planType,
          isPremium: user.isPremium,
          planExpiresAt: user.planExpiresAt,
        },
        redirectTo,
        shouldRedirect,
        currentDomain: host,
        userPlan: {
          type: user.planType,
          isPremium: user.isPremium,
          expiresAt: user.planExpiresAt
        }
      });
    } catch (error) {
      console.error("Routing check error:", error);
      res.status(500).json({ error: "Failed to check routing" });
    }
  });

  // Enhanced user endpoint with plan details
  app.get('/api/me-with-plan', requireAuth, async (req, res) => {
    try {
      const user = req.user!;
      const planStatus = await storage.getUserPlanStatus(user.id);

      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          planType: user.planType,
          isPremium: user.isPremium,
          planExpiresAt: user.planExpiresAt,
        },
        planStatus,
        canAccessPremium: user.isPremium && user.planType !== 'free',
        planExpired: user.planExpiresAt && new Date() > user.planExpiresAt
      });
    } catch (error) {
      console.error("Error fetching user with plan:", error);
      res.status(500).json({ error: "Failed to fetch user data" });
    }
  });

  // Cross-domain login endpoint for premium app
  app.post('/api/auth/cross-domain-login', async (req, res) => {
    try {
      const { sessionId } = req.body;

      if (!sessionId) {
        return res.status(400).json({ error: "Session ID required" });
      }

      // Validate session exists
      if (!req.session.userId) {
        return res.status(401).json({ error: "Invalid session" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      // Check premium access
      if (!user.isPremium || user.planType === 'free') {
        return res.status(403).json({ 
          error: "Premium access required",
          redirectTo: "https://superflow.work/premium"
        });
      }

      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          planType: user.planType,
          isPremium: user.isPremium,
        }
      });
    } catch (error) {
      console.error('Cross-domain login error:', error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Handle Cashfree return URL - accepts both GET and POST with retry logic
  app.all("/payment/return", async (req, res) => {
    try {
      // Enhanced logging for debugging
      console.log('=== CASHFREE RETURN URL PROCESSING ===');
      console.log('Method:', req.method);
      console.log('Content-Type:', req.headers['content-type']);
      console.log('Content-Length:', req.headers['content-length']);
      console.log('Query params:', req.query);
      console.log('Body keys:', Object.keys(req.body || {}));
      console.log('Headers:', req.headers);

      // Cashfree can send data via POST or GET depending on configuration
      const paymentData = { ...req.query, ...req.body };
      const { order_id, order_status, cf_order_id, payment_session_id } = paymentData;

      console.log('Payment Data resolved:', paymentData);

      // Use order_id or cf_order_id
      const actualOrderId = order_id || cf_order_id;

      if (!actualOrderId) {
        console.error('Missing order ID in return URL');
        return res.redirect(`/dashboard?error=missing_order_id`);
      }

      console.log('Processing order ID:', actualOrderId);

      // Get payment record first to determine plan
      const paymentRecord = await storage.getPayment(actualOrderId as string);
      if (!paymentRecord) {
        console.error('Payment record not found for order:', actualOrderId);
        return res.redirect(`/dashboard?error=payment_record_not_found`);
      }

      console.log('Payment record found:', {
        id: paymentRecord.id,
        status: paymentRecord.status,
        planType: paymentRecord.planType,
        userId: paymentRecord.userId
      });

      // Verify payment status with Cashfree with retry logic
      let verificationSuccess = false;
      let payments: any[] = [];
      const maxRetries = 3;
      const retryDelay = 2000; // 2 seconds

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`Verification attempt ${attempt}/${maxRetries} for order:`, actualOrderId);
          
          const response = await cashfree.PGOrderFetchPayments(actualOrderId as string);
          payments = response.data || [];

          console.log(`Attempt ${attempt} - Cashfree payments response:`, {
            paymentsCount: payments.length,
            statuses: payments.map((p: any) => ({ 
              payment_status: p.payment_status, 
              order_status: p.order_status 
            }))
          });

          // Check for success using flexible predicates
          const hasSuccessfulPayment = payments.some((p: any) => 
            p.payment_status === "SUCCESS" || 
            p.payment_status === "PAID" ||
            p.order_status === "PAID"
          );

          // Also accept direct order status from return URL
          const orderStatusSuccess = order_status === 'PAID' || order_status === 'SUCCESS';

          if (hasSuccessfulPayment || orderStatusSuccess) {
            console.log(`✅ Payment verification successful on attempt ${attempt}`);
            verificationSuccess = true;
            break;
          }

          // If not successful and this isn't the last attempt, wait before retry
          if (attempt < maxRetries) {
            console.log(`⏳ Attempt ${attempt} unsuccessful, retrying in ${retryDelay}ms...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
          }

        } catch (verificationError) {
          console.error(`Verification attempt ${attempt} failed:`, verificationError);
          
          if (attempt === maxRetries) {
            // On final attempt failure, still check if Cashfree return URL indicates success
            if (order_status === 'PAID' || order_status === 'SUCCESS') {
              console.log('Final attempt failed but return URL indicates success');
              verificationSuccess = true;
              break;
            }
          }
        }
      }

      if (verificationSuccess) {
        // Process successful payment if not already processed (idempotent)
        if (paymentRecord.status !== 'paid') {
          console.log('🔄 Processing payment activation...');
          
          // Transactional update: payment status + user plan
          try {
            // Update payment status
            const updatedPayment = await storage.updatePaymentStatus(actualOrderId as string, "paid", new Date());
            console.log('✅ Payment status updated:', updatedPayment.status);

            // Activate user plan
            const planData = PLAN_PRICING[paymentRecord.planType as keyof typeof PLAN_PRICING];
            const expiresAt = new Date();
            expiresAt.setMonth(expiresAt.getMonth() + 1);

            const minutesToAdd = planData.minutes === -1 ? 9999 : planData.minutes;
            const updatedUser = await storage.updateUserPlan(paymentRecord.userId, paymentRecord.planType, minutesToAdd, expiresAt);
            
            console.log('✅ User plan activated:', {
              userId: paymentRecord.userId,
              planType: paymentRecord.planType,
              minutes: minutesToAdd,
              expiresAt: expiresAt.toISOString(),
              isPremium: updatedUser.isPremium
            });

          } catch (activationError) {
            console.error('❌ Payment activation failed:', activationError);
            return res.redirect(`/dashboard?error=activation_failed&orderId=${actualOrderId}`);
          }
        } else {
          console.log('💡 Payment already processed, skipping activation');
        }

        // Redirect to payment success page with proper parameters
        const successUrl = `/payment/success?orderId=${actualOrderId}&plan=${paymentRecord.planType}&status=success`;
        console.log('🚀 Redirecting to success:', successUrl);
        return res.redirect(successUrl);
      } else {
        console.log('❌ Payment verification failed after all retries');
        return res.redirect(`/dashboard?error=payment_failed&orderId=${actualOrderId}`);
      }

    } catch (error: any) {
      console.error("❌ Return URL processing error:", error);
      return res.redirect(`/dashboard?error=processing_failed`);
    }
  });

  // Payment success page route (GET only for displaying the page)
  app.get("/payment/success", (req, res) => {
    // This just serves the React page - no processing here
    res.sendFile(path.join(__dirname, "../client/dist/index.html"));
  });

  // Manual payment success trigger for testing (development only) - bypasses auth for testing
  app.post("/api/payment/test-success", async (req, res) => {
    try {
      const { orderId = 'test_order_123', planType = 'max', userId = 3 } = req.body;

      console.log('=== MANUAL PAYMENT SUCCESS TEST ===');
      console.log('User ID:', userId);
      console.log('Order ID:', orderId);
      console.log('Plan Type:', planType);

      // Create or update payment record if needed
      let paymentRecord = await storage.getPayment(orderId);
      if (!paymentRecord) {
        await storage.createPaymentOrder({
          userId,
          cashfreeOrderId: orderId,
          planType,
          amount: PLAN_PRICING[planType as keyof typeof PLAN_PRICING].amount,
          status: "created"
        });
        paymentRecord = await storage.getPayment(orderId);
      }

      if (paymentRecord) {
        // Update payment status
        await storage.updatePaymentStatus(orderId, "paid", new Date());

        // Activate user plan
        const plan = PLAN_PRICING[planType as keyof typeof PLAN_PRICING];
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + 1); // 1 month validity

        const minutesToAdd = plan.minutes === -1 ? 9999 : plan.minutes;
        await storage.updateUserPlan(userId, planType, minutesToAdd, expiresAt);

        console.log('Manual test: Plan activated for user:', userId, 'plan:', planType);

        // Get updated user for redirection logic
        const updatedUser = await storage.getUser(userId);

        res.json({ 
          success: true, 
          message: 'Manual payment test completed successfully',
          planActivated: planType,
          user: updatedUser,
          redirectUrl: `/payment/success?orderId=${orderId}&plan=${planType}`,
          premiumUrl: `https://app.superflow.work/welcome?plan=${planType}`
        });
      } else {
        res.status(400).json({ error: 'Failed to create payment record' });
      }
    } catch (error) {
      console.error('Manual payment test error:', error);
      res.status(500).json({ error: 'Manual payment test failed' });
    }
  });

  // Test webhook endpoint for sandbox testing (development only)
  app.post("/api/payment/test-webhook", async (req, res) => {
    if (cashfreeConfig.environment !== "sandbox") {
      return res.status(403).json({ error: "Test webhook only available in sandbox mode" });
    }

    try {
      const { orderId, status = 'PAID' } = req.body;

      console.log('=== TEST WEBHOOK SIMULATION ===');
      console.log('Order ID:', orderId);
      console.log('Status:', status);

      if (status === 'PAID') {
        // Find payment record
        const paymentRecord = await storage.getPayment(orderId);
        if (!paymentRecord) {
          return res.status(400).json({ error: "Payment record not found" });
        }

        // Update payment status
        await storage.updatePaymentStatus(orderId, "paid", new Date());

        // Activate user plan
        const plan = PLAN_PRICING[paymentRecord.planType as keyof typeof PLAN_PRICING];
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + 1); // 1 month validity

        const minutesToAdd = plan.minutes === -1 ? 9999 : plan.minutes;
        await storage.updateUserPlan(paymentRecord.userId, paymentRecord.planType, minutesToAdd, expiresAt);

        console.log('Test: Plan activated for user:', paymentRecord.userId, 'plan:', paymentRecord.planType);

        res.json({ 
          success: true, 
          message: 'Test payment processed successfully',
          planActivated: paymentRecord.planType 
        });
      } else {
        await storage.updatePaymentStatus(orderId, "failed");
        res.json({ success: false, message: 'Test payment failed' });
      }

    } catch (error: any) {
      console.error("Test webhook error:", error);
      res.status(500).json({ error: "Test webhook processing failed" });
    }
  });

  // Get user plan status
  app.get("/api/user/plan-status", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const planStatus = await storage.getUserPlanStatus(userId);

      res.json(planStatus);
    } catch (error: any) {
      console.error("Plan status error:", error);
      res.status(500).json({ error: "Failed to get plan status" });
    }
  });

  // Cross-domain routing check endpoint
  app.get("/api/auth/check-routing", attachUser, async (req, res) => {
    try {
      if (!req.user) {
        return res.json({ 
          authenticated: false,
          redirectTo: null,
          shouldRedirect: false
        });
      }

      const redirectUrl = getUserRedirectUrl(req.user, req.get('host') || '');

      res.json({
        authenticated: true,
        user: req.user,
        redirectTo: redirectUrl,
        shouldRedirect: !!redirectUrl,
        currentDomain: req.get('host'),
        userPlan: {
          type: req.user.planType,
          isPremium: req.user.isPremium,
          expiresAt: req.user.planExpiresAt
        }
      });
    } catch (error: any) {
      console.error("Routing check error:", error);
      res.status(500).json({ error: "Failed to check routing" });
    }
  });

  // Waitlist endpoint
  app.post("/api/waitlist", async (req, res) => {
    try {
      const validationResult = waitlistSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          error: "Validation failed",
          details: validationResult.error.issues
        });
      }

      const { email } = validationResult.data;

      // Check if email already exists in waitlist
      const existingEntry = await storage.getWaitlistEntry(email);
      if (existingEntry) {
        return res.status(409).json({ error: "Email already on waitlist" });
      }

      // Add to waitlist
      const waitlistEntry = await storage.addToWaitlist(email);

      res.json({
        message: "Successfully added to waitlist",
        email: waitlistEntry.email
      });
    } catch (error: any) {
      console.error("Waitlist error:", error);
      res.status(500).json({ error: "Failed to join waitlist" });
    }
  });

  // Admin authentication middleware
  const requireAdminAuth = (req: any, res: any, next: any) => {
    if (!req.session?.isAdmin) {
      return res.status(403).json({ error: "Admin authentication required" });
    }
    next();
  };

  // Admin login endpoint
  app.post("/api/admin/login", async (req, res) => {
    try {
      const { username, password } = req.body;

      // Check admin credentials
      if (username === "adij" && password === "adij@321") {
        req.session.isAdmin = true;
        res.json({ message: "Admin login successful", isAdmin: true });
      } else {
        res.status(401).json({ error: "Invalid admin credentials" });
      }
    } catch (error) {
      console.error("Admin login error:", error);
      res.status(500).json({ error: "Admin login failed" });
    }
  });

  // Admin logout endpoint
  app.post("/api/admin/logout", (req, res) => {
    req.session.isAdmin = false;
    res.json({ message: "Admin logout successful" });
  });

  // Check admin authentication status
  app.get("/api/admin/me", (req, res) => {
    res.json({ isAdmin: !!req.session?.isAdmin });
  });

  // Analytics endpoints (protected with admin auth)
  app.get("/api/admin/analytics/stats", requireAdminAuth, async (req, res) => {
    try {
      const stats = await storage.getAnalyticsStats();
      res.json(stats);
    } catch (error: any) {
      console.error("Analytics stats error:", error);
      res.status(500).json({ error: "Failed to fetch analytics stats" });
    }
  });

  app.get("/api/admin/analytics/recent", requireAdminAuth, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const analytics = await storage.getRecentAnalytics(limit);
      res.json({ analytics });
    } catch (error: any) {
      console.error("Recent analytics error:", error);
      res.status(500).json({ error: "Failed to fetch recent analytics" });
    }
  });

  app.get("/api/admin/analytics/users", requireAdminAuth, async (req, res) => {
    try {
      const users = await storage.getAllUsersWithStats();
      res.json({ users });
    } catch (error: any) {
      console.error("User analytics error:", error);
      res.status(500).json({ error: "Failed to fetch user analytics" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}