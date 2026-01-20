import { Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import type { User } from "@shared/schema";

declare module "express-session" {
  interface SessionData {
    userId?: number;
    isAdmin?: boolean;
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

// Session configuration with cross-domain support
export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true, // Allow auto-creation in production
    ttl: sessionTtl,
    tableName: "sessions",
  });

  // Cross-domain configuration
  const isProduction = process.env.NODE_ENV === 'production';
  const domain = isProduction ? '.superflow.work' : undefined; // Works for both superflow.work and app.superflow.work

  return session({
    secret: process.env.SESSION_SECRET || "your-super-secret-key-change-in-production",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    name: 'superflow.session.id', // Consistent session name for cross-domain
    cookie: {
      httpOnly: true,
      secure: isProduction, // Secure in production
      maxAge: sessionTtl,
      sameSite: isProduction ? "none" : "lax", // Required for cross-domain in production
      domain: domain, // Enable cross-subdomain sharing
    },
  });
}

// Middleware to check if user is authenticated
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      req.session.userId = undefined;
      return res.status(401).json({ error: "User not found" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(500).json({ error: "Authentication error" });
  }
};

// Middleware to attach user if logged in (optional auth)
export const attachUser = async (req: Request, res: Response, next: NextFunction) => {
  if (req.session.userId) {
    try {
      const user = await storage.getUser(req.session.userId);
      if (user) {
        req.user = user;
      }
    } catch (error) {
      console.error("Attach user error:", error);
    }
  }
  next();
};

// Password hashing utilities
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
};

export const comparePassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

// Create new user with email/password
export const createUserWithPassword = async (email: string, name: string, phone: string, password: string, termsAccepted: boolean): Promise<User> => {
  // Check if user already exists
  const existingUser = await storage.getUserByEmail(email);
  if (existingUser) {
    throw new Error("User with this email already exists");
  }

  // Hash password
  const hashedPassword = await hashPassword(password);

  // Create user
  const user = await storage.createUser({
    email,
    name,
    phone,
    password: hashedPassword,
    provider: "local",
    providerId: null,
    termsAccepted: termsAccepted ? new Date() : null,
  });

  return user;
};

// Authenticate user with email/password
export const authenticateUser = async (email: string, password: string): Promise<User | null> => {
  const user = await storage.getUserByEmail(email);
  if (!user || !user.password) {
    return null;
  }

  const isValidPassword = await comparePassword(password, user.password);
  if (!isValidPassword) {
    return null;
  }

  return user;
};

// Cross-domain user routing logic
export const getUserRedirectUrl = (user: User, requestHost: string): string | null => {
  const isMainApp = requestHost.includes('superflow.work') && !requestHost.includes('app.');
  const isPremiumApp = requestHost.includes('app.superflow.work');

  // Check if user has premium access
  const hasPremiumAccess = user.isPremium && user.planType !== 'free';

  // Check if plan has expired
  const isExpired = user.planExpiresAt && new Date() > user.planExpiresAt;

  if (isExpired) {
    // Expired users go to main app for renewal
    return isMainApp ? null : 'https://superflow.work/premium';
  }

  if (hasPremiumAccess) {
    // Premium users should be on premium app
    return isMainApp ? 'https://app.superflow.work/dashboard' : null;
  } else {
    // Free users should be on main app
    return isPremiumApp ? 'https://superflow.work/dashboard' : null;
  }
};

// Enhanced authentication middleware with cross-domain support
export const requireAuthWithRouting = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.userId) {
    return res.status(401).json({ 
      error: "Authentication required",
      redirectTo: "https://superflow.work/"
    });
  }

  try {
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      req.session.userId = undefined;
      return res.status(401).json({ 
        error: "User not found",
        redirectTo: "https://superflow.work/"
      });
    }

    // Check if user should be redirected to different domain
    const redirectUrl = getUserRedirectUrl(user, req.get('host') || '');
    if (redirectUrl) {
      return res.status(302).json({
        error: "Redirect required",
        redirectTo: redirectUrl,
        reason: user.isPremium ? "premium_access" : "free_user"
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(500).json({ error: "Authentication error" });
  }
};

// Enhanced error handling for cross-domain operations
export const handleCrossDomainError = (error: any, req: Request, res: Response) => {
  console.error("Cross-domain operation error:", error);

  const host = req.get('host') || '';
  const isMainApp = host.includes('superflow.work') && !host.includes('app.');

  if (error.message?.includes('ETIMEDOUT') || error.message?.includes('ECONNREFUSED')) {
    return res.status(503).json({
      error: "Service temporarily unavailable",
      message: "Please try again in a few moments",
      fallbackUrl: isMainApp ? "/dashboard" : "https://superflow.work/dashboard"
    });
  }

  if (error.message?.includes('session') || error.message?.includes('expired')) {
    return res.status(401).json({
      error: "Session expired",
      message: "Please log in again",
      redirectTo: "https://superflow.work/"
    });
  }

  return res.status(500).json({
    error: "Internal server error",
    message: "Something went wrong. Please try again.",
    fallbackUrl: isMainApp ? "/dashboard" : "https://superflow.work/dashboard"
  });
};

// Plan expiry check with graceful degradation
export const checkPlanExpiry = async (userId: number): Promise<{ isExpired: boolean; daysLeft: number; shouldDowngrade: boolean }> => {
  try {
    const user = await storage.getUser(userId);
    if (!user || !user.planExpiresAt) {
      return { isExpired: false, daysLeft: -1, shouldDowngrade: false };
    }

    const now = new Date();
    const expiryDate = new Date(user.planExpiresAt);
    const timeDiff = expiryDate.getTime() - now.getTime();
    const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));

    const isExpired = timeDiff <= 0;
    const shouldDowngrade = isExpired && user.isPremium;

    // Auto-downgrade expired users
    if (shouldDowngrade) {
      await storage.updateUser(userId, {
        planType: 'free',
        isPremium: false,
        minutesRemaining: 30 // Reset to free plan limits
      });

      console.log(`[PLAN_EXPIRY] User ${userId} auto-downgraded to free plan`);
    }

    return { isExpired, daysLeft, shouldDowngrade };
  } catch (error) {
    console.error("Plan expiry check error:", error);
    return { isExpired: false, daysLeft: -1, shouldDowngrade: false };
  }
};