import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import fs from "fs";
import path from "path";
import OpenAI from "openai";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import { storage } from "./storage";
import { authenticateUser, optionalAuth, requirePremiumPlan, hasFeatureAccess, handleCrossDomainLogin, type AuthenticatedRequest } from "./premium-auth";

// Set ffmpeg path
if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}

const upload = multer({ 
  dest: '/tmp/',
  limits: { 
    fileSize: 100 * 1024 * 1024 // 100MB limit for premium users
  }
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function registerPremiumRoutes(app: Express): Promise<Server> {
  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', app: 'premium', timestamp: new Date().toISOString() });
  });

  // Cross-domain authentication routes
  app.post('/api/auth/cross-login', handleCrossDomainLogin);
  
  app.get('/api/auth/user', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      res.json({ user });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Premium transcription endpoint with enhanced features
  app.post('/api/premium/transcribe', 
    upload.single('audio'),
    authenticateUser,
    requirePremiumPlan(),
    async (req: AuthenticatedRequest, res) => {
      console.log('=== PREMIUM TRANSCRIPTION REQUEST ===');
      console.log('Timestamp:', new Date().toISOString());
      console.log('User ID:', req.user?.id);
      console.log('Plan Type:', req.user?.planType);

      try {
        if (!req.file || req.file.size === 0) {
          return res.status(400).json({
            error: "Audio upload failed",
            message: "Please upload a valid audio file.",
            type: "UPLOAD_ERROR"
          });
        }

        console.log('Premium file info:', {
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
          path: req.file.path,
        });

        // Extract premium options
        const enableSpeakerDetection = req.body.enableSpeakerDetection === 'true';
        const enableTimestamps = req.body.enableTimestamps === 'true';
        const transcriptionQuality = req.body.transcriptionQuality || 'high';
        const processingPriority = req.body.processingPriority || 'high';

        const audioPath = req.file.path;
        const outputPath = `${audioPath}.wav`;

        // Enhanced audio conversion for premium quality
        await new Promise<void>((resolve, reject) => {
          const command = ffmpeg(audioPath)
            .toFormat('wav')
            .audioFrequency(16000)
            .audioChannels(1);

          // Premium quality settings
          if (transcriptionQuality === 'premium') {
            command.audioBitrate('320k');
          } else if (transcriptionQuality === 'high') {
            command.audioBitrate('192k');
          }

          command
            .on('end', () => {
              console.log('Premium audio conversion completed:', outputPath);
              resolve();
            })
            .on('error', (err) => {
              console.error('Premium audio conversion error:', err);
              reject(err);
            })
            .save(outputPath);
        });

        const convertedStats = fs.statSync(outputPath);
        console.log('Premium converted file stats:', convertedStats);

        // Enhanced Whisper transcription
        console.log('Starting premium Whisper transcription...');
        const transcription = await openai.audio.transcriptions.create({
          file: fs.createReadStream(outputPath),
          model: "whisper-1",
          response_format: enableTimestamps ? "verbose_json" : "text",
          language: "en",
        });

        console.log('Premium Whisper transcription successful');

        let transcript = '';
        let speakerSegments = [];

        if (typeof transcription === 'string') {
          transcript = transcription;
        } else {
          transcript = transcription.text;
          
          // Process segments for speaker detection (simulated for MVP)
          if (enableSpeakerDetection && transcription.segments) {
            speakerSegments = transcription.segments.map((segment: any, index: number) => ({
              speaker: `Speaker ${(index % 2) + 1}`, // Simple speaker alternation for MVP
              text: segment.text,
              startTime: segment.start,
              endTime: segment.end,
            }));
          }
        }

        // Enhanced content processing with premium prompts
        console.log('Starting premium content enhancement...');
        const enhancementPrompt = `
        You are a premium AI content enhancer for professional content creators.
        
        Original transcript: "${transcript}"
        
        User profession: ${req.user?.profession || 'Content Creator'}
        Quality level: ${transcriptionQuality}
        
        Enhance this content with:
        ${transcriptionQuality === 'premium' ? '- Executive-level clarity and professionalism' : ''}
        ${transcriptionQuality === 'high' ? '- Enhanced readability and structure' : ''}
        - Perfect grammar and flow
        - Engaging and compelling language
        - Professional tone appropriate for the user's profession
        - Clear structure with proper formatting
        
        Return only the enhanced content, nothing else.
        `;

        const completion = await openai.chat.completions.create({
          model: transcriptionQuality === 'premium' ? "gpt-4" : "gpt-4o-mini",
          messages: [{ role: "user", content: enhancementPrompt }],
          max_tokens: 1000,
          temperature: 0.7,
        });

        const processedContent = completion.choices[0]?.message?.content || transcript;

        // Calculate recording duration
        const duration = Math.round(req.file.size / 16000); // Approximate duration

        // Save premium recording with enhanced metadata
        const recording = await storage.createRecording({
          userId: req.user!.id,
          transcript,
          processedContent,
          duration,
          fileSize: req.file.size,
          audioFileName: req.file.originalname,
          hasMultipleSpeakers: speakerSegments.length > 1,
          speakerCount: enableSpeakerDetection ? Math.max(1, speakerSegments.length) : null,
          transcriptionQuality,
          processingPriority,
        });

        // Track premium feature usage
        await storage.trackPremiumFeatureUsage(req.user!.id, 'premium_transcription');
        
        // Premium users don't lose minutes - unlimited usage
        console.log(`[PREMIUM AUDIT] User ${req.user!.id} - Premium processing - ${duration}s - Quality: ${transcriptionQuality} - ${new Date().toISOString()}`);

        // Cleanup temporary files
        try {
          fs.unlinkSync(audioPath);
          fs.unlinkSync(outputPath);
        } catch (cleanupError) {
          console.error('File cleanup error:', cleanupError);
        }

        const response = {
          transcript,
          processedContent,
          speakerSegments: enableSpeakerDetection ? speakerSegments : undefined,
          confidence: 0.95, // Premium confidence score
          language: 'en',
          duration,
          processingTime: Date.now() - new Date(req.headers['x-start-time'] as string || Date.now()).getTime(),
          quality: transcriptionQuality,
          recordingId: recording.id,
        };

        res.json(response);
      } catch (error: any) {
        console.error('Premium transcription error:', error);
        
        // Cleanup on error
        try {
          if (req.file?.path) {
            fs.unlinkSync(req.file.path);
            fs.unlinkSync(`${req.file.path}.wav`);
          }
        } catch (cleanupError) {
          console.error('Error cleanup failed:', cleanupError);
        }

        res.status(500).json({
          error: "Premium transcription failed",
          message: error.message || "An error occurred during premium processing",
          type: "TRANSCRIPTION_ERROR"
        });
      }
    }
  );

  // File upload endpoint for premium users
  app.post('/api/premium/upload-file',
    upload.single('audio'),
    authenticateUser,
    hasFeatureAccess('file_upload'),
    async (req: AuthenticatedRequest, res) => {
      try {
        if (!req.file || req.file.size === 0) {
          return res.status(400).json({
            error: "File upload failed",
            message: "Please select a valid audio file.",
          });
        }

        // Store file metadata
        const audioFile = await storage.createAudioFile({
          userId: req.user!.id,
          originalFileName: req.file.originalname,
          mimeType: req.file.mimetype,
          fileSize: req.file.size,
          processingStatus: 'pending',
        });

        // Track feature usage
        await storage.trackPremiumFeatureUsage(req.user!.id, 'file_upload');

        res.json({
          fileId: audioFile.id,
          fileName: audioFile.originalFileName,
          fileSize: audioFile.fileSize,
          status: 'uploaded',
          message: 'File uploaded successfully and ready for processing'
        });

      } catch (error: any) {
        console.error('File upload error:', error);
        res.status(500).json({
          error: "File upload failed",
          message: error.message || "Failed to process uploaded file"
        });
      }
    }
  );

  // Premium user plan status
  app.get('/api/premium/plan-status', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      res.json({
        planType: user?.planType || 'free',
        isPremium: user?.isPremium || false,
        planExpiresAt: user?.planExpiresAt,
        isUnlimited: user?.planType === 'max',
        features: {
          unlimitedRecording: true,
          fileUpload: ['pro', 'max'].includes(user?.planType || ''),
          speakerDetection: ['pro', 'max'].includes(user?.planType || ''),
          priorityProcessing: user?.planType === 'max',
        }
      });
    } catch (error) {
      console.error("Error fetching premium plan status:", error);
      res.status(500).json({ error: "Failed to fetch plan status" });
    }
  });

  // Premium recordings with enhanced metadata
  app.get('/api/premium/recordings', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const recordings = await storage.getUserRecordings(req.user!.id);
      res.json({ recordings });
    } catch (error) {
      console.error("Error fetching premium recordings:", error);
      res.status(500).json({ error: "Failed to fetch recordings" });
    }
  });

  // Premium user statistics
  app.get('/api/premium/stats', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const stats = await storage.getUserStats(req.user!.id);
      const premiumStats = await storage.getPremiumFeatureStats(req.user!.id);
      
      res.json({
        ...stats,
        premiumFeatures: premiumStats,
        isUnlimited: req.user?.planType === 'max',
      });
    } catch (error) {
      console.error("Error fetching premium stats:", error);
      res.status(500).json({ error: "Failed to fetch premium statistics" });
    }
  });

  // Social media generation (same as main app)
  app.post('/api/generate-social-content', authenticateUser, async (req: AuthenticatedRequest, res) => {
    console.log('=== PREMIUM SOCIAL MEDIA GENERATION REQUEST ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('User ID:', req.user?.id);
    
    try {
      const { content } = req.body;
      
      if (!content || content.trim().length === 0) {
        return res.status(400).json({
          error: "Content is required",
          message: "Please provide content to generate social media posts."
        });
      }

      console.log('Processing premium content for social media generation...');
      console.log('Content length:', content.length);

      const userProfession = req.user?.profession || 'Content Creator';
      const enhancedPrompt = `
      You are an expert social media content creator specializing in ${userProfession} content.
      
      Transform this content into engaging social media posts for different platforms:
      
      "${content}"
      
      Create platform-optimized content with:
      
      Instagram: Write an engaging caption (max 2200 chars) with relevant hashtags
      Twitter: Create a thread of tweets (max 280 chars each)
      YouTube: Write an engaging title and description with tags
      Facebook: Create an engaging post optimized for Facebook
      
      Return ONLY a valid JSON object with this structure:
      {
        "instagram": {
          "caption": "engaging caption here",
          "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3"]
        },
        "twitter": {
          "thread": ["tweet 1", "tweet 2", "tweet 3"]
        },
        "youtube": {
          "title": "engaging title",
          "description": "detailed description", 
          "tags": ["tag1", "tag2", "tag3"]
        },
        "facebook": {
          "post": "engaging facebook post"
        }
      }
      `;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: enhancedPrompt }],
        max_tokens: 2000,
        temperature: 0.7,
      });

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) {
        throw new Error('No response from OpenAI');
      }

      let socialContent;
      try {
        socialContent = JSON.parse(responseContent);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        throw new Error('Failed to parse social media content');
      }

      console.log('Premium social media content generated successfully');

      res.json({ socialContent });
    } catch (error: any) {
      console.error('Premium social media generation error:', error);
      res.status(500).json({
        error: "Social media generation failed",
        message: error.message || "Failed to generate social media content"
      });
    }
  });

  // Premium subscription management
  app.get('/api/premium/subscription', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      const payments = await storage.getUserPayments(req.user!.id);
      
      res.json({
        currentPlan: {
          type: user?.planType,
          expiresAt: user?.planExpiresAt,
          isActive: user?.isPremium,
        },
        paymentHistory: payments,
        nextBilling: user?.planExpiresAt,
      });
    } catch (error) {
      console.error("Error fetching subscription:", error);
      res.status(500).json({ error: "Failed to fetch subscription details" });
    }
  });

  // Premium feature usage analytics
  app.get('/api/premium/usage-analytics', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const analytics = await storage.getPremiumAnalytics(req.user!.id);
      res.json({ analytics });
    } catch (error) {
      console.error("Error fetching premium analytics:", error);
      res.status(500).json({ error: "Failed to fetch usage analytics" });
    }
  });

  // Logout
  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destruction error:', err);
        return res.status(500).json({ error: 'Logout failed' });
      }
      res.clearCookie('connect.sid');
      res.json({ message: 'Logout successful' });
    });
  });

  // User data endpoints (for premium users only)
  app.get('/api/user/premium-features', authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const features = await storage.getUserPremiumFeatures(req.user!.id);
      res.json({ features });
    } catch (error) {
      console.error("Error fetching premium features:", error);
      res.status(500).json({ error: "Failed to fetch premium features" });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);
  return httpServer;
}