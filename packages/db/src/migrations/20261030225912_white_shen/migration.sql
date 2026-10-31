CREATE SCHEMA IF NOT EXISTS "little_adventures";
--> statement-breakpoint
CREATE TABLE "little_adventures"."waitlist" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"email" text NOT NULL UNIQUE,
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "little_adventures"."waitlist_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"platform" text NOT NULL
);
