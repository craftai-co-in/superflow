import bcrypt from "bcryptjs";
import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "./storage";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    name: string;
    planType: string;
    isPremium: boolean;
  };
}

// Cross-domain authentication middleware for premium app
export const authenticateUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.session?.userId;
    
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    // Premium app requires paid plan
    if (!user.isPremium || user.planType === 'free') {
      return res.status(403).json({ 
        error: "Premium access required",
        message: "This feature requires a premium subscription",
        redirectTo: "https://superflow.work/premium"
      });
    }

    // Check if plan has expired
    if (user.planExpiresAt && new Date() > user.planExpiresAt) {
      await storage.updateUser(userId, { 
        planType: 'free', 
        isPremium: false,
        minutesRemaining: 0 
      });
      
      return res.status(403).json({ 
        error: "Plan expired",
        message: "Your premium plan has expired. Please renew to continue.",
        redirectTo: "https://superflow.work/premium"
      });
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name || '',
      planType: user.planType || 'free',
      isPremium: user.isPremium || false,
    };

    next();
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(500).json({ error: "Authentication failed" });
  }
};

// Optional authentication for public endpoints
export const optionalAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.session?.userId;
    
    if (userId) {
      const user = await storage.getUser(userId);
      if (user) {
        req.user = {
          id: user.id,
          email: user.email,
          name: user.name || '',
          planType: user.planType || 'free',
          isPremium: user.isPremium || false,
        };
      }
    }
    
    next();
  } catch (error) {
    console.error("Optional auth error:", error);
    next(); // Continue without user data
  }
};

// Cross-domain login handler
export const handleCrossDomainLogin = async (req: Request, res: Response) => {
  try {
    const { email, password, source } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await storage.getUserByEmail(email);
    if (!user || !user.password) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Create session
    req.session.userId = user.id;
    
    // Determine redirect based on user plan
    let redirectUrl = "https://superflow.work/dashboard";
    if (user.isPremium && user.planType !== 'free') {
      redirectUrl = "https://app.superflow.work/dashboard";
    }

    // If this login is from the main app, check if user should be redirected to premium
    if (source === 'main_app' && user.isPremium) {
      return res.json({ 
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          planType: user.planType,
          isPremium: user.isPremium,
        },
        redirectToPremium: true,
        redirectUrl: "https://app.superflow.work/dashboard"
      });
    }

    res.json({ 
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        planType: user.planType,
        isPremium: user.isPremium,
      },
      redirectUrl: redirectUrl
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
};

// Premium user validation middleware
export const requirePremiumPlan = (allowedPlans: string[] = ['lite', 'pro', 'max']) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const user = req.user;
    
    if (!user || !user.isPremium || !allowedPlans.includes(user.planType)) {
      return res.status(403).json({
        error: "Premium plan required",
        message: `This feature requires one of the following plans: ${allowedPlans.join(', ')}`,
        currentPlan: user?.planType || 'free',
        redirectTo: "https://superflow.work/premium"
      });
    }
    
    next();
  };
};

// Check if user has specific premium feature access
export const hasFeatureAccess = (feature: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const user = req.user;
    
    const featureMap: { [key: string]: string[] } = {
      'unlimited_recording': ['lite', 'pro', 'max'],
      'file_upload': ['pro', 'max'],
      'speaker_detection': ['pro', 'max'],
      'priority_processing': ['max'],
      'advanced_editing': ['max'],
    };

    const requiredPlans = featureMap[feature] || [];
    
    if (!user || !user.isPremium || !requiredPlans.includes(user.planType)) {
      return res.status(403).json({
        error: "Feature access denied",
        message: `This feature requires: ${requiredPlans.join(' or ')} plan`,
        currentPlan: user?.planType || 'free',
        feature: feature
      });
    }
    
    next();
  };
};