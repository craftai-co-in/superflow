CREATE TABLE "recording_analytics" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"user_type" varchar NOT NULL,
	"recording_duration" integer,
	"processing_success" varchar DEFAULT 'success' NOT NULL,
	"user_agent" varchar,
	"ip_address" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "recording_analytics" ADD CONSTRAINT "recording_analytics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;