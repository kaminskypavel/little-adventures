CREATE TABLE "little_adventures"."children" (
	"age" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"grown_up" boolean DEFAULT false NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"kind" text NOT NULL,
	"look" text DEFAULT 'clay' NOT NULL,
	"name" text NOT NULL,
	"owner_id" text NOT NULL,
	"photo_key" text,
	"puppy" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "children_owner_id_idx" ON "little_adventures"."children" ("owner_id");