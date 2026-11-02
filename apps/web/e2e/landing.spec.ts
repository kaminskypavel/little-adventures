import { expect, type Page, test } from "@playwright/test";

// Clips stream from the CDN, so the loader can take a while.
const LOADER_TIMEOUT = 45_000;
const LOAD_TEST_TIMEOUT = 90_000;

const HOME_LINE =
	"Little adventures that start with your child's own questions.";
const SCENE_1_TITLE = "Children are curious. Help them learn.";

const ES_TITLE = /cuentos que nacen de la curiosidad/u;
const FR_TITLE = /des histoires nées de la curiosité/u;
const FR_URL = /\/fr$/u;
const HOME_URL = /\/$/u;
const ANY = /.+/u;
const CANONICAL = /^https:\/\/www\.littleadventures\.app/u;

const waitForStory = (page: Page) =>
	expect(page.locator("[data-loader]")).toBeHidden({ timeout: LOADER_TIMEOUT });

// Index of the scene copy that is fully shown, or -1 while one fades.
const shownScene = (page: Page) =>
	page.evaluate(() =>
		[...document.querySelectorAll("[data-copy]")].findIndex((el) => {
			const style = getComputedStyle(el);
			return style.visibility !== "hidden" && Number(style.opacity) === 1;
		})
	);

// Playwright's touchscreen only taps, so a swipe goes through CDP.
async function swipeUp(page: Page) {
	const cdp = await page.context().newCDPSession(page);
	const x = 195;
	let y = 600;
	await cdp.send("Input.dispatchTouchEvent", {
		touchPoints: [{ x, y }],
		type: "touchStart",
	});
	for (let i = 0; i < 6; i += 1) {
		y -= 50;
		// biome-ignore lint/performance/noAwaitInLoops: touch steps must go out in order
		await cdp.send("Input.dispatchTouchEvent", {
			touchPoints: [{ x, y }],
			type: "touchMove",
		});
	}
	await cdp.send("Input.dispatchTouchEvent", {
		touchPoints: [],
		type: "touchEnd",
	});
}

test.describe("english home", () => {
	test("shows the first scene and the scroll hint", async ({ page }) => {
		test.setTimeout(LOAD_TEST_TIMEOUT);
		await page.goto("/");
		await waitForStory(page);
		await expect(page.locator('[data-copy="0"]')).toContainText(HOME_LINE);
		await expect.poll(() => shownScene(page)).toBe(0);
		await expect(page.locator("[data-hint]")).toBeVisible();
	});

	test("one gesture moves one scene", async ({ page }, testInfo) => {
		test.setTimeout(LOAD_TEST_TIMEOUT);
		await page.goto("/");
		await waitForStory(page);
		await expect.poll(() => shownScene(page)).toBe(0);

		if (testInfo.project.name === "phone") {
			await swipeUp(page);
		} else {
			await page.mouse.move(720, 450);
			await page.mouse.wheel(0, 120);
		}

		await expect.poll(() => shownScene(page), { timeout: 10_000 }).toBe(1);
		await expect(page.locator('[data-copy="1"]')).toContainText(SCENE_1_TITLE);
		// Still scene 1 after the move has fully settled: the gesture did not carry on.
		await page.waitForTimeout(2500);
		expect(await shownScene(page)).toBe(1);
	});

	test("a scroll made during a move is kept", async ({ page }, testInfo) => {
		test.setTimeout(LOAD_TEST_TIMEOUT);
		await page.goto("/");
		await waitForStory(page);
		const scroll = async () => {
			if (testInfo.project.name === "phone") {
				await swipeUp(page);
			} else {
				await page.mouse.move(720, 450);
				await page.mouse.wheel(0, 120);
			}
		};
		await scroll();
		// A pause ends the first gesture; the second lands while the first move still plays.
		await page.waitForTimeout(400);
		await scroll();

		await expect.poll(() => shownScene(page), { timeout: 10_000 }).toBe(2);
		await page.waitForTimeout(2500);
		expect(await shownScene(page)).toBe(2);
	});
});

test.describe("languages", () => {
	test("/es and /fr have their own titles", async ({ page }) => {
		const es = await page.goto("/es");
		expect(es?.status()).toBe(200);
		await expect(page).toHaveTitle(ES_TITLE);

		const fr = await page.goto("/fr");
		expect(fr?.status()).toBe(200);
		await expect(page).toHaveTitle(FR_TITLE);
	});

	test.describe("french browser", () => {
		test.use({ locale: "fr-FR" });

		test("redirects to /fr, and the menu switches back to English", async ({
			page,
		}) => {
			test.setTimeout(LOAD_TEST_TIMEOUT);
			await page.goto("/");
			await expect(page).toHaveURL(FR_URL);
			await waitForStory(page);

			await page.locator("button[popovertarget]").click();
			await page.getByRole("link", { name: "English" }).click();

			await expect(page).toHaveURL(HOME_URL);
			await expect(page.locator('[data-copy="0"]')).toContainText(HOME_LINE);
		});
	});
});

test("early access opens a form that asks for the email only", async ({
	page,
}) => {
	test.setTimeout(LOAD_TEST_TIMEOUT);
	await page.goto("/");
	await waitForStory(page);
	await page.locator("[data-early]").click();
	const dialog = page.locator("dialog[open]");
	await expect(dialog.locator('input[type="email"]')).toBeVisible();
	await expect(
		dialog.getByRole("button", { name: "Send me an invitation" })
	).toBeVisible();
	await expect(dialog.locator("input")).toHaveCount(1);
});

for (const path of ["/", "/es", "/fr"]) {
	test(`share tags and canonical on ${path}`, async ({ page }) => {
		await page.goto(path, { waitUntil: "domcontentloaded" });
		await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
			"content",
			ANY
		);
		await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute(
			"content",
			ANY
		);
		await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
			"href",
			CANONICAL
		);
	});
}

test("unknown path is a 404", async ({ page }) => {
	const res = await page.goto("/de");
	expect(res?.status()).toBe(404);
});
