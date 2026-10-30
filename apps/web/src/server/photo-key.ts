const EXTENSIONS = {
	"image/heic": "heic",
	"image/jpeg": "jpg",
	"image/png": "png",
} as const;

export type PhotoContentType = keyof typeof EXTENSIONS;

export const PHOTO_CONTENT_TYPES = Object.keys(EXTENSIONS) as [
	PhotoContentType,
	...PhotoContentType[],
];

/** Object key for one uploaded photo. The server picks it, never the client. */
export const photoKey = (userId: string, contentType: string) => {
	const extension = Object.hasOwn(EXTENSIONS, contentType)
		? EXTENSIONS[contentType as PhotoContentType]
		: undefined;
	if (!extension) {
		throw new Error(`Unsupported photo type: ${contentType}`);
	}
	return `little-adventures/users/${userId}/photos/${crypto.randomUUID()}.${extension}`;
};
