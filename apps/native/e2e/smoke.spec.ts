import { expect, test } from "@playwright/test";

const BAD_EMAIL = "That email does not look right.";
const AT_WELCOME = /\/welcome$/u;
const AT_ACCOUNT = /\/account$/u;

test("a signed-out grown-up gets from Welcome to the email step, and a bad address is refused", async ({
	page,
}) => {
	const crashes: string[] = [];
	page.on("pageerror", (error) => crashes.push(error.message));

	await page.goto("/");
	await expect(page).toHaveURL(AT_WELCOME);
	await expect(
		page.getByText("Stories that start with your child's curiosity")
	).toBeVisible();

	await page.getByText("Get started").click();
	await expect(page).toHaveURL(AT_ACCOUNT);
	await page.getByText("Continue with email").click();

	const email = page.getByLabel("Email");
	await email.fill("not-an-email");
	await email.blur();
	await expect(page.getByText(BAD_EMAIL)).toBeVisible();

	await email.fill("grown-up@example.com");
	await email.blur();
	await expect(page.getByText(BAD_EMAIL)).toBeHidden();

	expect(crashes).toEqual([]);
});
