import { expect, test } from "bun:test";

import { nativeCallbackUrl } from "./native-callback";

test("bounce keeps the query string and swaps in the app scheme", () => {
	expect(
		nativeCallbackUrl("littleadventures", "?neon_auth_session_verifier=abc")
	).toBe("littleadventures://auth/callback?neon_auth_session_verifier=abc");
});

test("bounce without a query string has none", () => {
	expect(nativeCallbackUrl("littleadventures", "")).toBe(
		"littleadventures://auth/callback"
	);
});
