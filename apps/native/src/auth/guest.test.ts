import { describe, expect, test } from "bun:test";
import { isGuestEmail, isGuestReadOnly } from "./guest";

describe("isGuestEmail", () => {
	test("matches the guest, ignoring case and spaces", () => {
		expect(isGuestEmail("guest@littleadventures.app")).toBe(true);
		expect(isGuestEmail(" Guest@LittleAdventures.app ")).toBe(true);
	});
	test("refuses everyone else", () => {
		expect(isGuestEmail("mom@example.com")).toBe(false);
		expect(isGuestEmail(null)).toBe(false);
		expect(isGuestEmail(undefined)).toBe(false);
	});
});

describe("isGuestReadOnly", () => {
	test("sees a tRPC and an engine error", () => {
		expect(
			isGuestReadOnly({
				data: { code: "FORBIDDEN" },
				message: "GUEST_READ_ONLY",
			})
		).toBe(true);
		expect(
			isGuestReadOnly({ code: "FORBIDDEN", message: "GUEST_READ_ONLY" })
		).toBe(true);
	});
	test("ignores other forbidden answers and other errors", () => {
		expect(
			isGuestReadOnly({ data: { code: "FORBIDDEN" }, message: "Admins only" })
		).toBe(false);
		expect(isGuestReadOnly(new Error("GUEST_READ_ONLY"))).toBe(false);
		expect(isGuestReadOnly(null)).toBe(false);
	});
});
