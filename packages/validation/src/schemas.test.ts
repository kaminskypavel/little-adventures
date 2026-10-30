import { expect, test } from "bun:test";
import { childSchema } from "./child";
import { photoUploadRequestSchema } from "./photo";
import { codeSchema, emailSchema } from "./sign-in";

test("a child needs a name, a kind and an age from 2 to 11", () => {
	expect(
		childSchema.safeParse({ age: 5, kind: "boy", name: " Ari " }).data
	).toEqual({
		age: 5,
		kind: "boy",
		name: "Ari",
	});
	expect(
		childSchema.safeParse({ age: 5, kind: "boy", name: "  " }).success
	).toBe(false);
	expect(
		childSchema.safeParse({ age: 1, kind: "girl", name: "Ari" }).success
	).toBe(false);
	expect(
		childSchema.safeParse({ age: 12, kind: "girl", name: "Ari" }).success
	).toBe(false);
	expect(childSchema.safeParse({ kind: "girl", name: "Ari" }).success).toBe(
		false
	);
});

test("email is trimmed and lowercased; a bad one fails", () => {
	expect(emailSchema.parse({ email: " Me@Example.COM " })).toEqual({
		email: "me@example.com",
	});
	expect(emailSchema.safeParse({ email: "me@" }).success).toBe(false);
});

test("the code is exactly 6 digits", () => {
	expect(codeSchema.safeParse({ code: "123456" }).success).toBe(true);
	expect(codeSchema.safeParse({ code: "12345" }).success).toBe(false);
	expect(codeSchema.safeParse({ code: "12345a" }).success).toBe(false);
});

test("photo upload requests take known image types and a positive size", () => {
	expect(
		photoUploadRequestSchema.safeParse({
			contentType: "image/jpeg",
			size: 1000,
		}).success
	).toBe(true);
	expect(
		photoUploadRequestSchema.safeParse({ contentType: "image/gif", size: 1000 })
			.success
	).toBe(false);
	expect(
		photoUploadRequestSchema.safeParse({ contentType: "image/png", size: 0 })
			.success
	).toBe(false);
});
