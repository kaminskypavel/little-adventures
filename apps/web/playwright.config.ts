import { defineConfig, devices } from "@playwright/test";

// Port 3017 is fixed: the video CDN's CORS allows only localhost:3001 and :3017.
const PORT = 3017;
const CI = Boolean(process.env.CI);

// The landing never calls auth or the database, but varlock validates these at build
// and start time. Obvious placeholders only.
const PLACEHOLDER_ENV = {
	DATABASE_URL: "postgres://placeholder:placeholder@localhost:5432/placeholder",
	NEON_AUTH_BASE_URL: "https://placeholder.invalid",
	NEON_AUTH_COOKIE_SECRET: "placeholder-placeholder-placeholder-32",
};

export default defineConfig({
	forbidOnly: CI,
	projects: [
		{
			name: "desktop",
			use: {
				...devices["Desktop Chrome"],
				viewport: { height: 900, width: 1440 },
			},
		},
		{
			name: "phone",
			use: {
				...devices["Desktop Chrome"],
				deviceScaleFactor: 2,
				hasTouch: true,
				isMobile: true,
				viewport: { height: 844, width: 390 },
			},
		},
	],
	reporter: CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
	retries: CI ? 1 : 0,
	testDir: "./e2e",
	use: { baseURL: `http://localhost:${PORT}`, trace: "on-first-retry" },
	// Serves an existing production build: run `bun run build` first.
	webServer: {
		command: `bunx next start -p ${PORT}`,
		env: {
			DATABASE_URL: process.env.DATABASE_URL ?? PLACEHOLDER_ENV.DATABASE_URL,
			NEON_AUTH_BASE_URL:
				process.env.NEON_AUTH_BASE_URL ?? PLACEHOLDER_ENV.NEON_AUTH_BASE_URL,
			NEON_AUTH_COOKIE_SECRET:
				process.env.NEON_AUTH_COOKIE_SECRET ??
				PLACEHOLDER_ENV.NEON_AUTH_COOKIE_SECRET,
		},
		reuseExistingServer: !CI,
		timeout: 120_000,
		url: `http://localhost:${PORT}`,
	},
});
