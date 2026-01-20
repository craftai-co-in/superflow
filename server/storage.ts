import { users, recordings, waitlist, recordingAnalytics, payments, usageTracking, type User, type InsertUser, type Recording, type InsertRecording, type Waitlist, type InsertAnalytics, type Analytics, type Payment, type InsertPayment, type UsageTracking, type InsertUsageTracking } from "@shared/schema";
import { db } from "./db";
import { eq, desc, count, gte, lte, sql } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations for authentication
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(insertUser: Omit<InsertUser, 'id'>): Promise<User>;
  updateUser(id: number, updates: Partial<Omit<InsertUser, 'id'>>): Promise<User>;
  updateUserProfession(id: number, profession: string): Promise<User>;

  // Recording operations for user history
  createRecording(insertRecording: Omit<InsertRecording, 'id'>): Promise<Recording>;
  getUserRecordings(userId: number, limit?: number): Promise<Recording[]>;
  getUserRecordingStats(userId: number): Promise<{ totalRecordings: number; totalDuration: number }>;

  // Waitlist operations
  addToWaitlist(email: string): Promise<Waitlist>;
  getWaitlistEntry(email: string): Promise<Waitlist | undefined>;

  // Data deletion operations for compliance
  deleteUser(id: number): Promise<boolean>;
  deleteUserRecordings(userId: number): Promise<boolean>;

  // Analytics operations
  createAnalyticsEntry(data: InsertAnalytics): Promise<Analytics>;
  getAnalyticsStats(): Promise<{
    totalRecordings: number;
    totalUsers: number;
    totalFreeRecordings: number;
    totalAuthenticatedRecordings: number;
    todayRecordings: number;
    thisWeekRecordings: number;
    thisMonthRecordings: number;
  }>;
  getRecentAnalytics(limit?: number): Promise<Analytics[]>;
  getUserAnalytics(userId: number): Promise<Analytics[]>;
  getAnalyticsByDateRange(startDate: Date, endDate: Date): Promise<Analytics[]>;
  getAllUsersWithStats(): Promise<Array<User & { recordingCount: number; lastActivity: Date | null }>>;

  // Payment operations
  createPaymentOrder(data: InsertPayment): Promise<Payment>;
  updatePaymentStatus(orderId: string, status: string, paidAt?: Date): Promise<Payment>;
  getPayment(orderId: string): Promise<Payment | undefined>;
  getUserPayments(userId: number): Promise<Payment[]>;
  
  // Plan status operations
  getUserPlanStatus(userId: number): Promise<{ planType: string; minutesRemaining: number; isPremium: boolean; expiresAt: Date | null }>;
  updateUserPlan(userId: number, planType: string, minutesRemaining: number, expiresAt: Date): Promise<User>;
  
  // Usage tracking operations
  trackUsage(data: InsertUsageTracking): Promise<UsageTracking>;
  checkMinutesRemaining(userId: number): Promise<number>;
  deductMinutes(userId: number, durationSeconds: number): Promise<User>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: Omit<InsertUser, 'id'>): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        updatedAt: new Date(),
      })
      .returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<Omit<InsertUser, 'id'>>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserProfession(id: number, profession: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ profession, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Recording operations for user history
  async createRecording(insertRecording: Omit<InsertRecording, 'id'>): Promise<Recording> {
    const [recording] = await db
      .insert(recordings)
      .values(insertRecording)
      .returning();
    return recording;
  }

  async getUserRecordings(userId: number, limit: number = 10): Promise<Recording[]> {
    return db
      .select()
      .from(recordings)
      .where(eq(recordings.userId, userId))
      .orderBy(desc(recordings.createdAt))
      .limit(limit);
  }

  async getUserRecordingStats(userId: number): Promise<{ totalRecordings: number; totalDuration: number }> {
    const [result] = await db
      .select({
        totalRecordings: count(),
      })
      .from(recordings)
      .where(eq(recordings.userId, userId));

    // Get all recordings to sum duration (since we need actual values not aggregate)
    const userRecordings = await db
      .select({ duration: recordings.duration })
      .from(recordings)
      .where(eq(recordings.userId, userId));

    const totalRecordings = result?.totalRecordings || 0;
    const totalDuration = userRecordings.reduce((sum, r) => sum + (r.duration || 0), 0);

    return { totalRecordings, totalDuration };
  }

  // Waitlist operations
  async addToWaitlist(email: string): Promise<Waitlist> {
    const [waitlistEntry] = await db
      .insert(waitlist)
      .values({ email })
      .returning();
    return waitlistEntry;
  }

  async getWaitlistEntry(email: string): Promise<Waitlist | undefined> {
    const [entry] = await db.select().from(waitlist).where(eq(waitlist.email, email));
    return entry;
  }

  // Data deletion operations for compliance
  async deleteUserRecordings(userId: number): Promise<boolean> {
    try {
      await db.delete(recordings).where(eq(recordings.userId, userId));
      return true;
    } catch (error) {
      console.error("Error deleting user recordings:", error);
      return false;
    }
  }

  async deleteUser(userId: number): Promise<boolean> {
    try {
      await db.delete(recordings).where(eq(recordings.userId, userId));
      await db.delete(users).where(eq(users.id, userId));
      return true;
    } catch (error) {
      console.error("Error deleting user:", error);
      return false;
    }
  }

  // Analytics operations
  async createAnalyticsEntry(data: InsertAnalytics): Promise<Analytics> {
    const [entry] = await db
      .insert(recordingAnalytics)
      .values(data)
      .returning();
    return entry;
  }

  async getAnalyticsStats(): Promise<{
    totalRecordings: number;
    totalUsers: number;
    totalFreeRecordings: number;
    totalAuthenticatedRecordings: number;
    todayRecordings: number;
    thisWeekRecordings: number;
    thisMonthRecordings: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);

    const [totalRecordingsResult] = await db
      .select({ count: count() })
      .from(recordingAnalytics);

    const [totalUsersResult] = await db
      .select({ count: count() })
      .from(users);

    const [freeRecordingsResult] = await db
      .select({ count: count() })
      .from(recordingAnalytics)
      .where(eq(recordingAnalytics.userType, 'free'));

    const [authRecordingsResult] = await db
      .select({ count: count() })
      .from(recordingAnalytics)
      .where(eq(recordingAnalytics.userType, 'authenticated'));

    const [todayRecordingsResult] = await db
      .select({ count: count() })
      .from(recordingAnalytics)
      .where(gte(recordingAnalytics.createdAt, today));

    const [weekRecordingsResult] = await db
      .select({ count: count() })
      .from(recordingAnalytics)
      .where(gte(recordingAnalytics.createdAt, weekAgo));

    const [monthRecordingsResult] = await db
      .select({ count: count() })
      .from(recordingAnalytics)
      .where(gte(recordingAnalytics.createdAt, monthAgo));

    return {
      totalRecordings: totalRecordingsResult?.count || 0,
      totalUsers: totalUsersResult?.count || 0,
      totalFreeRecordings: freeRecordingsResult?.count || 0,
      totalAuthenticatedRecordings: authRecordingsResult?.count || 0,
      todayRecordings: todayRecordingsResult?.count || 0,
      thisWeekRecordings: weekRecordingsResult?.count || 0,
      thisMonthRecordings: monthRecordingsResult?.count || 0,
    };
  }

  async getRecentAnalytics(limit: number = 100): Promise<Analytics[]> {
    return await db
      .select()
      .from(recordingAnalytics)
      .orderBy(desc(recordingAnalytics.createdAt))
      .limit(limit);
  }

  async getUserAnalytics(userId: number): Promise<Analytics[]> {
    return await db
      .select()
      .from(recordingAnalytics)
      .where(eq(recordingAnalytics.userId, userId))
      .orderBy(desc(recordingAnalytics.createdAt));
  }

  async getAnalyticsByDateRange(startDate: Date, endDate: Date): Promise<Analytics[]> {
    return await db
      .select()
      .from(recordingAnalytics)
      .where(
        sql`${recordingAnalytics.createdAt} >= ${startDate} AND ${recordingAnalytics.createdAt} <= ${endDate}`
      )
      .orderBy(desc(recordingAnalytics.createdAt));
  }

  async getAllUsersWithStats(): Promise<Array<User & { recordingCount: number; lastActivity: Date | null }>> {
    const result = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        phone: users.phone,
        password: users.password,
        provider: users.provider,
        providerId: users.providerId,
        profession: users.profession,
        termsAccepted: users.termsAccepted,
        planType: users.planType,
        minutesRemaining: users.minutesRemaining,
        planExpiresAt: users.planExpiresAt,
        isPremium: users.isPremium,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        recordingCount: count(recordings.id),
        lastActivity: sql<Date | null>`MAX(${recordings.createdAt})`.as('lastActivity'),
      })
      .from(users)
      .leftJoin(recordings, eq(users.id, recordings.userId))
      .groupBy(users.id)
      .orderBy(desc(users.createdAt));

    return result;
  }

  // Payment operations
  async createPaymentOrder(data: InsertPayment): Promise<Payment> {
    const [payment] = await db
      .insert(payments)
      .values(data)
      .returning();
    return payment;
  }

  async updatePaymentStatus(orderId: string, status: string, paidAt?: Date): Promise<Payment> {
    const [payment] = await db
      .update(payments)
      .set({ status, paidAt })
      .where(eq(payments.cashfreeOrderId, orderId))
      .returning();
    return payment;
  }

  async getPayment(orderId: string): Promise<Payment | undefined> {
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.cashfreeOrderId, orderId));
    return payment;
  }

  async getUserPayments(userId: number): Promise<Payment[]> {
    return await db
      .select()
      .from(payments)
      .where(eq(payments.userId, userId))
      .orderBy(desc(payments.createdAt));
  }

  // Plan status operations
  async getUserPlanStatus(userId: number): Promise<{ planType: string; minutesRemaining: number; isPremium: boolean; expiresAt: Date | null }> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    return {
      planType: user.planType || 'free',
      minutesRemaining: user.minutesRemaining || 0,
      isPremium: user.isPremium || false,
      expiresAt: user.planExpiresAt
    };
  }

  async updateUserPlan(userId: number, planType: string, minutesRemaining: number, expiresAt: Date): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        planType,
        minutesRemaining,
        planExpiresAt: expiresAt,
        isPremium: planType !== 'free',
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Usage tracking operations
  async trackUsage(data: InsertUsageTracking): Promise<UsageTracking> {
    const [usage] = await db
      .insert(usageTracking)
      .values(data)
      .returning();
    return usage;
  }

  async checkMinutesRemaining(userId: number): Promise<number> {
    const user = await this.getUser(userId);
    return user?.minutesRemaining || 0;
  }

  async deductMinutes(userId: number, durationSeconds: number): Promise<User> {
    const durationMinutes = Math.ceil(durationSeconds / 60);
    const user = await this.getUser(userId);
    
    if (!user) {
      throw new Error('User not found');
    }

    const remainingMinutes = Math.max(0, (user.minutesRemaining || 0) - durationMinutes);
    
    // Track usage
    await this.trackUsage({
      userId,
      duration: durationSeconds,
      remainingMinutes
    });

    // Update user's remaining minutes
    const [updatedUser] = await db
      .update(users)
      .set({
        minutesRemaining: remainingMinutes,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    
    return updatedUser;
  }
}

export const storage = new DatabaseStorage();