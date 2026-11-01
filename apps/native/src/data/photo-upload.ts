import { photoUploadRequestSchema } from "@little-adventures/validation/photo";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { trpcClient } from "./trpc";

const LONG_EDGE = 1600;
const QUALITY = 0.8;
const CONTENT_TYPE = "image/jpeg";

/**
 * Downscale the picked photo to 1600 px on the long edge as a JPEG, ask the server for a signed
 * upload address, send the bytes straight to storage, and return the storage key.
 * Throws when any step fails.
 */
export async function uploadChildPhoto(uri: string): Promise<string> {
	// Decoding is bounded by the box, so a small photo is never enlarged.
	const context = ImageManipulator.manipulate(uri, {
		maxHeight: LONG_EDGE,
		maxWidth: LONG_EDGE,
	});
	const image = await context.renderAsync();
	const saved = await image.saveAsync({
		compress: QUALITY,
		format: SaveFormat.JPEG,
	});
	context.release();
	image.release();
	const bytes = await (await fetch(saved.uri)).blob();

	const request = photoUploadRequestSchema.parse({
		contentType: CONTENT_TYPE,
		size: bytes.size,
	});
	const { key, uploadUrl } = await trpcClient.photo.uploadUrl.mutate(request);

	const put = await fetch(uploadUrl, {
		body: bytes,
		headers: { "content-type": CONTENT_TYPE },
		method: "PUT",
	});
	if (!put.ok) {
		throw new Error(`upload ${put.status}`);
	}
	return key;
}
