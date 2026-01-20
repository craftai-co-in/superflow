import {
  users,
  recordings,
  waitlist,
  recordingAnalytics,
  payments,
  usageTracking,
  premiumFeatures,
  audioFiles,
  type User,
  type Recording,
  type Analytics,
  type UpsertUser,
  type PremiumFeature,
  type AudioFile,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, sql } from "drizzle-orm";

// Enhanced interface for premium storage operations
export interface IPremiumStorage {
  // User operations (inherited from main app)
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: UpsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User>;
  
  // Enhanced recording operations with premium metadata
  createRecording(recording: Partial<Recording>): Promise<Recording>;
  getUserRecordings(userId: number, limit?: number): Promise<Recording[]>;
  getRecording(id: number): Promise<Recording | undefined>;
  
  // Premium feature operations
  trackPremiumFeatureUsage(userId: number, featureName: string): Promise<void>;
  getUserPremiumFeatures(userId: number): Promise<PremiumFeature[]>;
  getPremiumFeatureStats(userId: number): Promise<any>;
  
  // Audio file management
  createAudioFile(audioFile: Partial<AudioFile>): Promise<AudioFile>;
  getAudioFile(id: number): Promise<AudioFile | undefined>;
  updateAudioFileStatus(id: number, status: string): Promise<void>;
  
  // Enhanced analytics and stats
  getUserStats(userId: number): Promise<any>;
  getPremiumAnalytics(userId: number): Promise<any>;
  
  // Payment and subscription operations
  getUserPayments(userId: number): Promise<any[]>;
  getActiveSubscription(userId: number): Promise<any>;
}

export class PremiumDatabaseStorage implements IPremiumStorage {
  // User operations (same as main app)
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: UpsertUser): Promise<User> {
    const [user] = await db.insert(users).values({
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Enhanced recording operations with premium metadata
  async createRecording(recordingData: Partial<Recording>): Promise<Recording> {
    const [recording] = await db.insert(recordings).values({
      ...recordingData,
      createdAt: new Date(),
    } as any).returning();
    return recording;
  }

  async getUserRecordings(userId: number, limit = 50): Promise<Recording[]> {
    return db
      .select()
      .from(recordings)
      .where(eq(recordings.userId, userId))
      .orderBy(desc(recordings.createdAt))
      .limit(limit);
  }

  async getRecording(id: number): Promise<Recording | undefined> {
    const [recording] = await db.select().from(recordings).where(eq(recordings.id, id));
    return recording;
  }

  // Premium feature operations
  async trackPremiumFeatureUsage(userId: number, featureName: string): Promise<void> {
    const [existingFeature] = await db
      .select()
      .from(premiumFeatures)
      .where(and(
        eq(premiumFeatures.userId, userId),
        eq(premiumFeatures.featureName, featureName)
      ));

    if (existingFeature) {
      await db
        .update(premiumFeatures)
        .set({
          usageCount: sql`${premiumFeatures.usageCount} + 1`,
          lastUsed: new Date(),
        })
        .where(eq(premiumFeatures.id, existingFeature.id));
    } else {
      await db.insert(premiumFeatures).values({
        userId,
        featureName,
        usageCount: 1,
        lastUsed: new Date(),
        createdAt: new Date(),
      });
    }
  }

  async getUserPremiumFeatures(userId: number): Promise<PremiumFeature[]> {
    return db
      .select()
      .from(premiumFeatures)
      .where(eq(premiumFeatures.userId, userId))
      .orderBy(desc(premiumFeatures.lastUsed));
  }

  async getPremiumFeatureStats(userId: number): Promise<any> {
    const features = await this.getUserPremiumFeatures(userId);
    
    const stats = features.reduce((acc, feature) => {
      acc[feature.featureName] = {
        usageCount: feature.usageCount,
        lastUsed: feature.lastUsed,
      };
      return acc;
    }, {} as any);

    return stats;
  }

  // Audio file management
  async createAudioFile(audioFileData: Partial<AudioFile>): Promise<AudioFile> {
    const [audioFile] = await db.insert(audioFiles).values({
      ...audioFileData,
      createdAt: new Date(),
    } as any).returning();
    return audioFile;
  }

  async getAudioFile(id: number): Promise<AudioFile | undefined> {
    const [audioFile] = await db.select().from(audioFiles).where(eq(audioFiles.id, id));
    return audioFile;
  }

  async updateAudioFileStatus(id: number, status: string): Promise<void> {
    await db
      .update(audioFiles)
      .set({ processingStatus: status })
      .where(eq(audioFiles.id, id));
  }

  // Enhanced analytics and stats
  async getUserStats(userId: number): Promise<any> {
    // Get recording count and total duration
    const recordingStats = await db
      .select({
        totalRecordings: sql<number>`count(*)::int`,
        totalDuration: sql<number>`coalesce(sum(${recordings.duration}), 0)::int`,
      })
      .from(recordings)
      .where(eq(recordings.userId, userId));

    // Get recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentActivity = await db
      .select({
        recentRecordings: sql<number>`count(*)::int`,
      })
      .from(recordings)
      .where(and(
        eq(recordings.userId, userId),
        gte(recordings.createdAt, thirtyDaysAgo)
      ));

    return {
      totalRecordings: recordingStats[0]?.totalRecordings || 0,
      totalDuration: recordingStats[0]?.totalDuration || 0,
      recentRecordings: recentActivity[0]?.recentRecordings || 0,
      lastRecording: new Date().toISOString(), // Would get actual last recording date
    };
  }

  async getPremiumAnalytics(userId: number): Promise<any> {
    // Get feature usage analytics
    const featureUsage = await this.getUserPremiumFeatures(userId);
    
    // Get processing quality distribution
    const qualityStats = await db
      .select({
        quality: recordings.transcriptionQuality,
        count: sql<number>`count(*)::int`,
      })
      .from(recordings)
      .where(eq(recordings.userId, userId))
      .groupBy(recordings.transcriptionQuality);

    // Get monthly usage trends
    const monthlyUsage = await db
      .select({
        month: sql<string>`date_trunc('month', ${recordings.createdAt})::text`,
        recordings: sql<number>`count(*)::int`,
        totalDuration: sql<number>`sum(${recordings.duration})::int`,
      })
      .from(recordings)
      .where(eq(recordings.userId, userId))
      .groupBy(sql`date_trunc('month', ${recordings.createdAt})`)
      .orderBy(desc(sql`date_trunc('month', ${recordings.createdAt})`))
      .limit(12);

    return {
      featureUsage,
      qualityDistribution: qualityStats,
      monthlyTrends: monthlyUsage,
    };
  }

  // Payment and subscription operations
  async getUserPayments(userId: number): Promise<any[]> {
    return db
      .select()
      .from(payments)
      .where(eq(payments.userId, userId))
      .orderBy(desc(payments.createdAt));
  }

  async getActiveSubscription(userId: number): Promise<any> {
    const user = await this.getUser(userId);
    if (!user || !user.isPremium) return null;

    return {
      planType: user.planType,
      expiresAt: user.planExpiresAt,
      isActive: user.isPremium && (!user.planExpiresAt || new Date() < user.planExpiresAt),
    };
  }

  // Analytics tracking (same as main app)
  async trackAnalytics(data: {
    userId?: number;
    userType: string;
    recordingDuration?: number;
    processingSuccess: string;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<void> {
    await db.insert(recordingAnalytics).values({
      ...data,
      createdAt: new Date(),
    });
  }
}

// Export singleton instance
export const premiumStorage = new PremiumDatabaseStorage();