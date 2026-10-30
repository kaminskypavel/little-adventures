import { expect, test } from "bun:test";

import { type Principal, resolvePrincipal } from "./bearer";

const bearerUser: Principal = { user: { id: "from-token" } };
const cookieUser: Principal = { user: { id: "from-cookie" } };

const setup = (verified: Principal | null) => {
	const calls = { cookie: 0, invalid: 0, verify: [] as string[] };
	return {
		calls,
		deps: {
			cookieSession: () => {
				calls.cookie += 1;
				return Promise.resolve(cookieUser);
			},
			onInvalidBearer: () => {
				calls.invalid += 1;
			},
			verify: (token: string) => {
				calls.verify.push(token);
				return Promise.resolve(verified);
			},
		},
	};
};

test("a valid bearer token wins and the cookie is never read", async () => {
	const { calls, deps } = setup(bearerUser);
	expect(await resolvePrincipal({ authorization: "Bearer abc", ...deps })).toBe(
		bearerUser
	);
	expect(calls.verify).toEqual(["abc"]);
	expect(calls.cookie).toBe(0);
	expect(calls.invalid).toBe(0);
});

test("a failing bearer token is null and never falls back to the cookie", async () => {
	const { calls, deps } = setup(null);
	expect(
		await resolvePrincipal({ authorization: "Bearer expired", ...deps })
	).toBeNull();
	expect(calls.cookie).toBe(0);
	expect(calls.invalid).toBe(1);
});

test("no header uses the cookie", async () => {
	const { calls, deps } = setup(bearerUser);
	const found = await Promise.all(
		[null, undefined, ""].map((authorization) =>
			resolvePrincipal({ authorization, ...deps })
		)
	);
	expect(found).toEqual([cookieUser, cookieUser, cookieUser]);
	expect(calls.cookie).toBe(3);
	expect(calls.verify).toEqual([]);
});

test("a header that is not Bearer <token> uses the cookie", async () => {
	const { calls, deps } = setup(bearerUser);
	const found = await Promise.all(
		["Basic x", "Bearer", "Bearer ", "Token abc"].map((authorization) =>
			resolvePrincipal({ authorization, ...deps })
		)
	);
	expect(found).toEqual([cookieUser, cookieUser, cookieUser, cookieUser]);
	expect(calls.cookie).toBe(4);
	expect(calls.verify).toEqual([]);
});

test("the Bearer scheme is case-insensitive", async () => {
	const { calls, deps } = setup(bearerUser);
	await resolvePrincipal({ authorization: "bearer abc", ...deps });
	expect(calls.verify).toEqual(["abc"]);
});
