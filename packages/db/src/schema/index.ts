import { integer, pgSchema, text, timestamp } from "drizzle-orm/pg-core";

// Own schema: this database is shared, nothing here may touch `public`.
export const littleAdventures = pgSchema("little_adventures");

export const waitlist = littleAdventures.table("waitlist", {
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	email: text("email").notNull().unique(),
	id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
	platform: text("platform", { enum: ["ios", "android"] }).notNull(),
});
