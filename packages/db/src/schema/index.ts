import {
	boolean,
	index,
	integer,
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

// One child profile of a signed-in grown-up. `ownerId` is the sign-in user id
// (no foreign key: users live in the sign-in service's own schema).
export const children = littleAdventures.table(
	"children",
	{
		age: integer("age").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
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
