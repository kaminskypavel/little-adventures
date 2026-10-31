CREATE TABLE "little_adventures"."ai_calls" (
	"child_id" uuid,
	"cost_micro_usd" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"error" text,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"model" text NOT NULL,
	"ms" integer NOT NULL,
	"ok" boolean NOT NULL,
	"operation" text NOT NULL,
	"owner_id" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "little_adventures"."children" ADD COLUMN "art_status" text DEFAULT 'idle' NOT NULL;--> statement-breakpoint
ALTER TABLE "little_adventures"."children" ADD COLUMN "drawings" jsonb DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "little_adventures"."children" ADD COLUMN "face_key" text;--> statement-breakpoint
CREATE INDEX "ai_calls_owner_id_idx" ON "little_adventures"."ai_calls" ("owner_id");