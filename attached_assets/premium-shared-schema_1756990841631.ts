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
  text,
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

// Users table for authentication (same as main app)
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

// Enhanced recordings table for premium features
export const recordings = pgTable("recordings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  transcript: text("transcript").notNull(), // Changed to TEXT for longer content
  processedContent: text("processed_content").notNull(), // Changed to TEXT for longer content
  duration: integer("duration"), // recording duration in seconds
  fileSize: integer("file_size"), // file size in bytes
  // Premium-specific fields
  audioFileName: varchar("audio_file_name"), // original uploaded file name
  hasMultipleSpeakers: boolean("has_multiple_speakers").default(false),
  speakerCount: integer("speaker_count"),
  transcriptionQuality: varchar("transcription_quality").default("standard"), // 'standard', 'high', 'premium'
  processingPriority: varchar("processing_priority").default("normal"), // 'normal', 'high', 'priority'
  createdAt: timestamp("created_at").defaultNow(),
});

// Waitlist table for premium features (unchanged)
export const waitlist = pgTable("waitlist", {
  id: serial("id").primaryKey(),
  email: varchar("email").unique().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Analytics table for tracking recording usage (unchanged)
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

// Payments table for payment tracking (unchanged)
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

// Usage tracking table for minute consumption (unchanged)
export const usageTracking = pgTable("usage_tracking", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  duration: integer("duration").notNull(), // recording duration in seconds
  remainingMinutes: integer("remaining_minutes").notNull(), // minutes left after this recording
  createdAt: timestamp("created_at").defaultNow(),
});

// NEW: Premium features table for advanced functionality
export const premiumFeatures = pgTable("premium_features", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  featureName: varchar("feature_name").notNull(), // 'speaker_detection', 'priority_queue', 'file_upload'
  usageCount: integer("usage_count").default(0),
  lastUsed: timestamp("last_used"),
  createdAt: timestamp("created_at").defaultNow(),
});

// NEW: Audio files table for file upload functionality
export const audioFiles = pgTable("audio_files", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  recordingId: integer("recording_id").references(() => recordings.id),
  originalFileName: varchar("original_file_name").notNull(),
  mimeType: varchar("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),
  duration: integer("duration"), // in seconds
  processingStatus: varchar("processing_status").default("pending"), // 'pending', 'processing', 'completed', 'failed'
  createdAt: timestamp("created_at").defaultNow(),
});

// Enhanced types and schemas
export const insertUserSchema = createInsertSchema(users);
export const insertRecordingSchema = createInsertSchema(recordings);
export const insertWaitlistSchema = createInsertSchema(waitlist);
export const insertAnalyticsSchema = createInsertSchema(recordingAnalytics);
export const insertPaymentSchema = createInsertSchema(payments);
export const insertUsageTrackingSchema = createInsertSchema(usageTracking);
export const insertPremiumFeaturesSchema = createInsertSchema(premiumFeatures);
export const insertAudioFilesSchema = createInsertSchema(audioFiles);

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
  audioFileName: z.string().nullable(),
  hasMultipleSpeakers: z.boolean().nullable(),
  speakerCount: z.number().nullable(),
  transcriptionQuality: z.string().nullable(),
  processingPriority: z.string().nullable(),
  createdAt: z.date().nullable(),
});

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

// Premium-specific schemas
export const selectPremiumFeaturesSchema = z.object({
  id: z.number(),
  userId: z.number(),
  featureName: z.string(),
  usageCount: z.number().nullable(),
  lastUsed: z.date().nullable(),
  createdAt: z.date().nullable(),
});

export const selectAudioFilesSchema = z.object({
  id: z.number(),
  userId: z.number(),
  recordingId: z.number().nullable(),
  originalFileName: z.string(),
  mimeType: z.string(),
  fileSize: z.number(),
  duration: z.number().nullable(),
  processingStatus: z.string().nullable(),
  createdAt: z.date().nullable(),
});

// API Request/Response types
export type User = z.infer<typeof selectUserSchema>;
export type Recording = z.infer<typeof selectRecordingSchema>;
export type Analytics = z.infer<typeof selectAnalyticsSchema>;
export type PremiumFeature = z.infer<typeof selectPremiumFeaturesSchema>;
export type AudioFile = z.infer<typeof selectAudioFilesSchema>;

export type UpsertUser = z.infer<typeof insertUserSchema>;

// Authentication schemas
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
});

export const professionSchema = z.object({
  profession: z.enum([
    'Content Creator',
    'Social Media Manager', 
    'Blogger/Writer',
    'Journalist',
    'YouTuber',
    'Business Professional',
    'Student',
    'Other'
  ])
});

// Payment schemas
export const createPaymentOrderSchema = z.object({
  planType: z.enum(['lite', 'pro', 'max']),
});

export const verifyPaymentSchema = z.object({
  orderId: z.string(),
  transactionId: z.string(),
});

export type CreatePaymentOrderRequest = z.infer<typeof createPaymentOrderSchema>;
export type VerifyPaymentRequest = z.infer<typeof verifyPaymentSchema>;

// Social media content structure
export interface SocialMediaContent {
  instagram: {
    caption: string;
    hashtags: string[];
  };
  twitter: {
    thread: string[];
  };
  youtube: {
    title: string;
    description: string;
    tags: string[];
  };
  facebook: {
    post: string;
  };
}

// Premium-specific file upload types
export const fileUploadSchema = z.object({
  file: z.any(), // File object
  transcriptionOptions: z.object({
    enableSpeakerDetection: z.boolean().default(false),
    transcriptionQuality: z.enum(['standard', 'high', 'premium']).default('high'),
    enableTimestamps: z.boolean().default(false),
    priority: z.enum(['normal', 'high', 'priority']).default('high'),
  }).optional(),
});

export type FileUploadRequest = z.infer<typeof fileUploadSchema>;

// Premium transcription response with enhanced features
export interface PremiumTranscriptionResponse {
  transcript: string;
  processedContent: string;
  speakerSegments?: Array<{
    speaker: string;
    text: string;
    startTime: number;
    endTime: number;
  }>;
  confidence: number;
  language: string;
  duration: number;
  processingTime: number;
  quality: 'standard' | 'high' | 'premium';
}