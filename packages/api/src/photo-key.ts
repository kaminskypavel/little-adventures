const EXTENSIONS = {
	"image/heic": "heic",
	"image/jpeg": "jpg",
	"image/png": "png",
} as const;

type PhotoContentType = keyof typeof EXTENSIONS;

/** Every object key of one grown-up starts with this. */
export const userPrefix = (userId: string) =>
	`little-adventures/users/${userId}/`;

/** Whether `key` is inside the user's own prefix (no `..` hops out of it). */
export const ownsKey = (userId: string, key: string) =>
	key.startsWith(userPrefix(userId)) && !key.split("/").includes("..");

/** Object key for one uploaded photo. The server picks it, never the client. */
export const photoKey = (userId: string, contentType: string) => {
	const extension = Object.hasOwn(EXTENSIONS, contentType)
		? EXTENSIONS[contentType as PhotoContentType]
		: undefined;
	if (!extension) {
		throw new Error(`Unsupported photo type: ${contentType}`);
	}
	return `${userPrefix(userId)}photos/${crypto.randomUUID()}.${extension}`;
};
