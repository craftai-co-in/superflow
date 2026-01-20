import { z } from "zod";
import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from 'drizzle-zod';

// Session storage table for authentication
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users table for authentication
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email").unique().notNull(),
  name: varchar("name"),
  phone: varchar("phone"),
  password: varchar("password"), // hashed password for local auth
  provider: varchar("provider").notNull().default("local"), // auth provider
  providerId: varchar("provider_id"), // external provider ID
  profession: varchar("profession"), // user's profession for content targeting
  termsAccepted: timestamp("terms_accepted"), // timestamp when user accepted terms & privacy
  // Payment & Plan fields
  planType: varchar("plan_type").default("free"), // 'free', 'lite', 'pro', 'max'
  minutesRemaining: integer("minutes_remaining").default(30), // recording minutes left
  planExpiresAt: timestamp("plan_expires_at"), // subscription expiry
  isPremium: boolean("is_premium").default(false), // quick premium check
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User recording history table
export const recordings = pgTable("recordings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  transcript: varchar("transcript").notNull(),
  processedContent: varchar("processed_content").notNull(),
  duration: integer("duration"), // recording duration in seconds
  fileSize: integer("file_size"), // file size in bytes
  createdAt: timestamp("created_at").defaultNow(),
});

// Waitlist table for premium features
export const waitlist = pgTable("waitlist", {
  id: serial("id").primaryKey(),
  email: varchar("email").unique().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Analytics table for tracking recording usage
export const recordingAnalytics = pgTable("recording_analytics", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id), // null for anonymous users
  userType: varchar("user_type").notNull(), // 'free', 'authenticated', 'premium'
  recordingDuration: integer("recording_duration"), // in seconds
  processingSuccess: varchar("processing_success").notNull().default("success"), // 'success', 'failed'
  userAgent: varchar("user_agent"),
  ipAddress: varchar("ip_address"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Payments table for payment tracking
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  cashfreeOrderId: varchar("cashfree_order_id").unique().notNull(),
  planType: varchar("plan_type").notNull(), // 'lite', 'pro', 'max'
  amount: integer("amount").notNull(), // amount in paisa (₹999 = 99900)
  status: varchar("status").notNull().default("created"), // 'created', 'paid', 'failed'
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Usage tracking table for minute consumption
export const usageTracking = pgTable("usage_tracking", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  duration: integer("duration").notNull(), // recording duration in seconds
  remainingMinutes: integer("remaining_minutes").notNull(), // minutes left after this recording
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users);
export const insertRecordingSchema = createInsertSchema(recordings);
export const insertWaitlistSchema = createInsertSchema(waitlist);
export const insertAnalyticsSchema = createInsertSchema(recordingAnalytics);
export const insertPaymentSchema = createInsertSchema(payments);
export const insertUsageTrackingSchema = createInsertSchema(usageTracking);

export const selectAnalyticsSchema = z.object({
  id: z.number(),
  userId: z.number().nullable(),
  userType: z.string(),
  recordingDuration: z.number().nullable(),
  processingSuccess: z.string(),
  userAgent: z.string().nullable(),
  ipAddress: z.string().nullable(),
  createdAt: z.date().nullable(),
});

export const selectUserSchema = z.object({
  id: z.number(),
  email: z.string(),
  name: z.string().nullable(),
  phone: z.string().nullable(),
  password: z.string().nullable(),
  provider: z.string(),
  providerId: z.string().nullable(),
  profession: z.string().nullable(),
  termsAccepted: z.date().nullable(),
  planType: z.string().nullable(),
  minutesRemaining: z.number().nullable(),
  planExpiresAt: z.date().nullable(),
  isPremium: z.boolean().nullable(),
  createdAt: z.date().nullable(),
  updatedAt: z.date().nullable(),
});

export const selectRecordingSchema = z.object({
  id: z.number(),
  userId: z.number(),
  transcript: z.string(),
  processedContent: z.string(),
  duration: z.number().nullable(),
  fileSize: z.number().nullable(),
  createdAt: z.date().nullable(),
});

export const selectWaitlistSchema = z.object({
  id: z.number(),
  email: z.string(),
  createdAt: z.date().nullable(),
});

export const selectPaymentSchema = z.object({
  id: z.number(),
  userId: z.number(),
  cashfreeOrderId: z.string(),
  planType: z.string(),
  amount: z.number(),
  status: z.string(),
  paidAt: z.date().nullable(),
  createdAt: z.date().nullable(),
});

export const selectUsageTrackingSchema = z.object({
  id: z.number(),
  userId: z.number(),
  duration: z.number(),
  remainingMinutes: z.number(),
  createdAt: z.date().nullable(),
});

export type User = z.infer<typeof selectUserSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Recording = z.infer<typeof selectRecordingSchema>;
export type InsertRecording = z.infer<typeof insertRecordingSchema>;
export type Waitlist = z.infer<typeof selectWaitlistSchema>;
export type InsertWaitlist = z.infer<typeof insertWaitlistSchema>;
export type Analytics = z.infer<typeof selectAnalyticsSchema>;
export type InsertAnalytics = z.infer<typeof insertAnalyticsSchema>;
export type Payment = z.infer<typeof selectPaymentSchema>;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type UsageTracking = z.infer<typeof selectUsageTrackingSchema>;
export type InsertUsageTracking = z.infer<typeof insertUsageTrackingSchema>;

// Transcription schemas
export const transcriptionRequestSchema = z.object({
  audioData: z.string(), // base64 encoded audio data
});

export const transcriptionResponseSchema = z.object({
  transcript: z.string(),
  processedContent: z.string(),
});

// Social media content schemas
export const socialMediaContentSchema = z.object({
  instagram: z.string(),
  facebook: z.string(),
  youtube: z.string(),
});

export const socialMediaRequestSchema = z.object({
  processedContent: z.string(), // The enhanced content to transform
});

export const socialMediaResponseSchema = z.object({
  socialContent: socialMediaContentSchema,
});

export type TranscriptionRequest = z.infer<typeof transcriptionRequestSchema>;
export type TranscriptionResponse = z.infer<typeof transcriptionResponseSchema>;
export type SocialMediaContent = z.infer<typeof socialMediaContentSchema>;
export type SocialMediaRequest = z.infer<typeof socialMediaRequestSchema>;
export type SocialMediaResponse = z.infer<typeof socialMediaResponseSchema>;

// Authentication schemas
export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const signupSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone number is required"),
  password: z.string()
    .min(6, "Password must be at least 6 characters")
    .regex(/^(?=.*[A-Za-z])(?=.*\d)/, "Password must contain both letters and numbers"),
  termsAccepted: z.boolean().refine(val => val === true, {
    message: "You must agree to the Terms of Service and Privacy Policy"
  }),
});

export type LoginRequest = z.infer<typeof loginSchema>;
export type SignupRequest = z.infer<typeof signupSchema>;

// Waitlist schema
export const waitlistSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export type WaitlistRequest = z.infer<typeof waitlistSchema>;

export const professionSchema = z.object({
  profession: z.string().min(1, "Please select a profession")
});
export type ProfessionRequest = z.infer<typeof professionSchema>;

// Payment schemas
export const createPaymentOrderSchema = z.object({
  planType: z.enum(["lite", "pro", "max"]),
});

export const verifyPaymentSchema = z.object({
  orderId: z.string(),
  transactionId: z.string(),
});

export const planStatusSchema = z.object({
  planType: z.string(),
  minutesRemaining: z.number(),
  isPremium: z.boolean(),
  expiresAt: z.date().nullable(),
});

export type CreatePaymentOrderRequest = z.infer<typeof createPaymentOrderSchema>;
export type VerifyPaymentRequest = z.infer<typeof verifyPaymentSchema>;
export type PlanStatusResponse = z.infer<typeof planStatusSchema>;
