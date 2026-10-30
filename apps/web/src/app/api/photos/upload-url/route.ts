import { z } from "zod";

import { verify } from "@/server/auth";
import { preflight, withCors } from "@/server/cors";
import { PHOTO_CONTENT_TYPES, photoKey } from "@/server/photo-key";
import { storage } from "@/server/storage";

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const BEARER_PREFIX = "bearer ";

const Body = z.object({
	contentType: z.enum(PHOTO_CONTENT_TYPES),
	size: z.number().int().positive(),
});

const json = (request: Request, body: unknown, status: number) =>
	withCors(request, Response.json(body, { status }));

export const OPTIONS = (request: Request) => preflight(request);

export async function POST(request: Request) {
	const header = request.headers.get("authorization") ?? "";
	const token = header.toLowerCase().startsWith(BEARER_PREFIX)
		? header.slice(BEARER_PREFIX.length).trim()
		: "";
	const principal = token ? await verify(token) : null;
	if (!principal) {
		return json(request, { error: "unauthorized" }, 401);
	}

	const body = Body.safeParse(await request.json().catch(() => null));
	if (!body.success) {
		return json(request, { error: "bad_request" }, 400);
	}
	const { contentType, size } = body.data;
	if (size > MAX_PHOTO_BYTES) {
		return json(request, { error: "too_large" }, 413);
	}

	const { key, uploadUrl } = await storage.uploadUrlFor({
		contentLength: size,
		contentType,
		key: photoKey(principal.user.id, contentType),
		maxBytes: MAX_PHOTO_BYTES,
	});
	return json(request, { key, uploadUrl }, 200);
}
