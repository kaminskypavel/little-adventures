CREATE TABLE "little_adventures"."invite_codes" (
	"active" boolean DEFAULT true NOT NULL,
	"code" text PRIMARY KEY,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"live_per_day" integer DEFAULT 3 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "little_adventures"."beta_members" ADD COLUMN "code" text;