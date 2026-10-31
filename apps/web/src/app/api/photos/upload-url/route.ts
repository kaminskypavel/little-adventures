import { photoKey } from "@little-adventures/api/photo-key";
import {
	PHOTO_MAX_BYTES,
	photoUploadRequestSchema,
} from "@little-adventures/validation/photo";

import { verify } from "@/server/auth";
import { preflight, withCors } from "@/server/cors";
import { storage } from "@/server/storage";

const BEARER_PREFIX = "bearer ";

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

	const body = photoUploadRequestSchema.safeParse(
		await request.json().catch(() => null)
	);
	if (!body.success) {
		return json(request, { error: "bad_request" }, 400);
	}
	const { contentType, size } = body.data;
	if (size > PHOTO_MAX_BYTES) {
		return json(request, { error: "too_large" }, 413);
	}

	const { key, uploadUrl } = await storage.uploadUrlFor({
		contentLength: size,
		contentType,
		key: photoKey(principal.user.id, contentType),
		maxBytes: PHOTO_MAX_BYTES,
	});
	return json(request, { key, uploadUrl }, 200);
}
