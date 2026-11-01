import { expect, test } from "bun:test";

import { betaEmails, inBeta } from "./beta";

test("only listed emails are in the beta, whatever their case", () => {
	const beta = betaEmails(" Pavel@Example.com, kid@home.test ,,");
	expect(inBeta(beta, "pavel@example.com")).toBe(true);
	expect(inBeta(beta, "KID@home.test")).toBe(true);
	expect(inBeta(beta, "someone@else.test")).toBe(false);
	expect(inBeta(beta, undefined)).toBe(false);
});

test("an unset list lets nobody in", () => {
	expect(inBeta(betaEmails(undefined), "pavel@example.com")).toBe(false);
	expect(inBeta(betaEmails(""), "pavel@example.com")).toBe(false);
});
