import {
	boolean,
	index,
	integer,
	jsonb,
	pgSchema,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";

// Own schema: this database is shared, nothing here may touch `public`.
export const littleAdventures = pgSchema("little_adventures");

export const waitlist = littleAdventures.table("waitlist", {
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	email: text("email").notNull().unique(),
	id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
	// Older rows say which store badge was tapped; the landing now asks for the email only.
	platform: text("platform", { enum: ["ios", "android"] }),
});

// Grown-ups who joined the private beta with the invite code (the judges). Grown-ups on the
// BETA_EMAILS list need no row. `livePerDay` caps their live adventures in any 24 hours; past
// it they get the recorded adventure.
export const betaMembers = littleAdventures.table("beta_members", {
	email: text("email"),
	joinedAt: timestamp("joined_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	livePerDay: integer("live_per_day").notNull().default(3),
	ownerId: text("owner_id").primaryKey(),
});

export const ART_STATUSES = ["idle", "working", "ready", "failed"] as const;

/** Look name to R2 key of the drawing, for example `{ clay: "little-adventures/users/..." }`. */
export type Drawings = Partial<Record<"clay" | "felt" | "wood", string>>;

// One child profile of a signed-in grown-up. `ownerId` is the sign-in user id
// (no foreign key: users live in the sign-in service's own schema).
export const children = littleAdventures.table(
	"children",
	{
		age: integer("age").notNull(),
		artStatus: text("art_status", { enum: ART_STATUSES })
			.notNull()
			.default("idle"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		/** R2 key of the drawn look cut out of its backdrop (the wait screen); null until cut. */
		cutKey: text("cut_key"),
		drawings: jsonb("drawings").$type<Drawings>().notNull().default({}),
		faceKey: text("face_key"),
		grownUp: boolean("grown_up").notNull().default(false),
		id: uuid("id").primaryKey().defaultRandom(),
		kind: text("kind", { enum: ["boy", "girl"] }).notNull(),
		look: text("look").notNull().default("clay"),
		name: text("name").notNull(),
		ownerId: text("owner_id").notNull(),
		photoKey: text("photo_key"),
		puppy: boolean("puppy").notNull().default(false),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date()),
	},
	(table) => [index("children_owner_id_idx").on(table.ownerId)]
);

// The grown-up's own photo, one per sign-in user. `ownerId` is the primary
// key and carries no foreign key, like `children.ownerId`.
export const grownUps = littleAdventures.table("grown_ups", {
	/** The word the child uses for this grown-up ("Papa", "Abba"); null until asked. */
	calledName: text("called_name"),
	/** "he" or "she", for the story; null until asked. */
	calledPronoun: text("called_pronoun", { enum: ["he", "she"] }),
	/** "mother", "father", "grandmother", "grandfather" or "other"; null until asked. */
	calledRelation: text("called_relation", {
		enum: ["mother", "father", "grandmother", "grandfather", "other"],
	}),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	/** R2 key of the drawn picture cut out of its backdrop (the wait screen); null until cut. */
	cutKey: text("cut_key"),
	/** R2 key of the grown-up's face cut-out; null until it is cut out, or when no person was found. */
	faceKey: text("face_key"),
	/** R2 key of the grown-up's drawn picture (the clay look, like the child's); null until drawn. */
	lookKey: text("look_key"),
	ownerId: text("owner_id").primaryKey(),
	photoKey: text("photo_key").notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow()
		.$onUpdate(() => new Date()),
});

// One model call, success or failure. `ownerId` and `childId` carry no foreign
// key, so a deleted child keeps its cost history.
export const aiCalls = littleAdventures.table(
	"ai_calls",
	{
		childId: uuid("child_id"),
		costMicroUsd: integer("cost_micro_usd").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		error: text("error"),
		id: uuid("id").primaryKey().defaultRandom(),
		model: text("model").notNull(),
		ms: integer("ms").notNull(),
		ok: boolean("ok").notNull(),
		operation: text("operation").notNull(),
		ownerId: text("owner_id").notNull(),
	},
	(table) => [index("ai_calls_owner_id_idx").on(table.ownerId)]
);
