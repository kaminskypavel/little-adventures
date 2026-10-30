import { expect, test } from "bun:test";
import {
	createLocalJWKSet,
	exportJWK,
	generateKeyPair,
	type JWTPayload,
	SignJWT,
} from "jose";

import { createBearerVerifier } from "./bearer";

const AUTH_BASE_URL =
	"https://ep-test.neonauth.us-east-2.aws.neon.tech/neondb/auth";
const ORIGIN = new URL(AUTH_BASE_URL).origin;

const signing = await generateKeyPair("EdDSA", { crv: "Ed25519" });
const jwks = createLocalJWKSet({
	keys: [{ ...(await exportJWK(signing.publicKey)), alg: "EdDSA", kid: "k1" }],
});
const verify = createBearerVerifier({ authBaseUrl: AUTH_BASE_URL, jwks });

const sign = (
	claims: JWTPayload,
	{
		aud = ORIGIN,
		exp = "15m",
		key = signing.privateKey,
	}: { aud?: string; exp?: number | string; key?: CryptoKey } = {}
) =>
	new SignJWT(claims)
		.setProtectedHeader({ alg: "EdDSA", kid: "k1" })
		.setIssuer(ORIGIN)
		.setAudience(aud)
		.setSubject("user-1")
		.setIssuedAt()
		.setExpirationTime(exp)
		.sign(key);

test("valid token yields sub as the user id plus email and name", async () => {
	const token = await sign({ email: "a@b.co", name: "Ada" });
	expect(await verify(token)).toEqual({
		user: { email: "a@b.co", id: "user-1", name: "Ada" },
	});
});

test("wrong audience is rejected", async () => {
	const token = await sign({}, { aud: "https://evil.example" });
	expect(await verify(token)).toBeNull();
});

test("expired token is rejected", async () => {
	const token = await sign({}, { exp: Math.floor(Date.now() / 1000) - 60 });
	expect(await verify(token)).toBeNull();
});

test("token signed by another key is rejected", async () => {
	const other = await generateKeyPair("EdDSA", { crv: "Ed25519" });
	const token = await sign({}, { key: other.privateKey });
	expect(await verify(token)).toBeNull();
});

test("banned user is rejected", async () => {
	const token = await sign({ banned: true });
	expect(await verify(token)).toBeNull();
});

test("garbage token is rejected without throwing", async () => {
	expect(await verify("not-a-jwt")).toBeNull();
});
