import { expect, test } from "bun:test";

import { GUEST_EMAIL, isGuest } from "./guest";

test("only the guest email is the guest, whatever its case", () => {
	expect(isGuest({ user: { email: GUEST_EMAIL, id: "g" } })).toBe(true);
	expect(
		isGuest({ user: { email: " Guest@LittleAdventures.app ", id: "g" } })
	).toBe(true);
	expect(isGuest({ user: { email: "pavel@example.com", id: "u" } })).toBe(
		false
	);
	expect(isGuest({ user: { id: "u" } })).toBe(false);
});
