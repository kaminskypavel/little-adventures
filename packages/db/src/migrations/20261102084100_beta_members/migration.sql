CREATE TABLE "little_adventures"."beta_members" (
	"email" text,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"live_per_day" integer DEFAULT 3 NOT NULL,
	"owner_id" text PRIMARY KEY
);
