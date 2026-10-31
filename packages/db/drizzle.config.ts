import { defineConfig } from "drizzle-kit";
import "varlock/auto-load";

export default defineConfig({
	dbCredentials: {
		url: process.env.DATABASE_URL || "",
	},
	dialect: "postgresql",
	migrations: { schema: "little_adventures", table: "__drizzle_migrations" },
	out: "./src/migrations",
	schema: "./src/schema/index.ts",
	schemaFilter: ["little_adventures"],
});
