import { z } from "zod";

/** Largest child photo the app may upload, after downscaling. */
export const PHOTO_MAX_BYTES = 10 * 1024 * 1024;

export const photoContentTypes = [
	"image/jpeg",
	"image/png",
	"image/heic",
] as const;

/** What the app asks for when it wants a signed upload url for the child's photo. */
export const photoUploadRequestSchema = z.object({
	contentType: z.enum(photoContentTypes),
	size: z.number().int().positive(),
});

export type PhotoUploadRequest = z.infer<typeof photoUploadRequestSchema>;
