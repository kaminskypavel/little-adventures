import { defineConfig, devices } from "@playwright/test";

const PORT = 8137;
const CI = Boolean(process.env.CI);

// The smoke flow never reaches the app server, but varlock wants a url at export time.
// Port 9 refuses at once, so every server call fails fast, as when the phone is offline.
const EXPORT_ENV = { EXPO_PUBLIC_SERVER_URL: "http://127.0.0.1:9" };

export default defineConfig({
	forbidOnly: CI,
	projects: [
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
	// Exports the app for the web (the same screens the phone runs) and serves the build.
	webServer: {
		command: `bunx expo export --platform web --output-dir dist && bunx expo serve --port ${PORT}`,
		env: EXPORT_ENV,
		reuseExistingServer: !CI,
		timeout: 300_000,
		url: `http://localhost:${PORT}`,
	},
});
