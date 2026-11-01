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
	platform: text("platform", { enum: ["ios", "android"] }).notNull(),
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
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	/** R2 key of the grown-up's face cut-out; null until it is cut out, or when no person was found. */
	faceKey: text("face_key"),
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
