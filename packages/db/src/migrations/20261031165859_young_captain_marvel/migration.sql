CREATE TABLE "little_adventures"."grown_ups" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"owner_id" text PRIMARY KEY,
	"photo_key" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
