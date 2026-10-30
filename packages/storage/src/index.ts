import {
	CopyObjectCommand,
	DeleteObjectCommand,
	GetObjectCommand,
	HeadObjectCommand,
	PutObjectCommand,
	paginateListObjectsV2,
	S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Cloudflare R2 through its S3-compatible API.
 *
 * Callers build object keys from their own ids (`users/<userId>/photo.jpg`),
 * store the KEY in the database and turn it into a url at read time with
 * `readUrl`. Stored absolute urls break when the read host changes; keys do not.
 *
 * Config is injected by the app. Storage is optional: with no R2 vars every
 * operation throws `NOT_CONFIGURED` and the caller decides what that means. A
 * partial set throws at creation, because it is always a deploy typo.
 */

export interface StorageConfig {
	R2_ACCESS_KEY_ID?: string;
	R2_ACCOUNT_ID?: string;
	R2_BUCKET?: string;
	/** Public read host (custom domain or r2.dev). Unset = private bucket, reads are presigned. */
	R2_PUBLIC_URL?: string;
	R2_SECRET_ACCESS_KEY?: string;
}

export const NOT_CONFIGURED = "R2 is not configured";

/** Ceiling for a presigned client upload. Callers may pass a lower one. */
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

const UPLOAD_TTL_SECONDS = 600;
const READ_TTL_SECONDS = 3600;
// ponytail: whole-body fetch with a timeout; switch to a streamed multipart
// upload (@aws-sdk/lib-storage) if single files grow past ~100MB.
const SOURCE_FETCH_TIMEOUT_MS = 60_000;
const TRAILING_SLASHES = /\/+$/u;

export interface StoredObject {
	etag: string;
	key: string;
	lastModified: Date;
	size: number;
}

/**
 * `CopySource` encoded per path segment: encoding the whole key would also
 * escape the `/` between folders and R2 would 404 the copy.
 */
function copySourceFor(bucket: string, key: string): string {
	return `/${bucket}/${key
		.split("/")
		.map((segment) => encodeURIComponent(segment))
		.join("/")}`;
}

function connect(config: StorageConfig) {
	const { R2_ACCESS_KEY_ID, R2_ACCOUNT_ID, R2_BUCKET, R2_SECRET_ACCESS_KEY } =
		config;
	if (
		!(R2_ACCESS_KEY_ID && R2_ACCOUNT_ID && R2_BUCKET && R2_SECRET_ACCESS_KEY)
	) {
		const required = {
			R2_ACCESS_KEY_ID,
			R2_ACCOUNT_ID,
			R2_BUCKET,
			R2_SECRET_ACCESS_KEY,
		};
		const missing = Object.entries(required)
			.filter(([, value]) => !value)
			.map(([key]) => key);
		if (missing.length === Object.keys(required).length) {
			return null;
		}
		throw new Error(
			`R2 is partially configured, missing ${missing.join(", ")}`
		);
	}
	return {
		accountId: R2_ACCOUNT_ID,
		bucket: R2_BUCKET,
		client: new S3Client({
			credentials: {
				accessKeyId: R2_ACCESS_KEY_ID,
				secretAccessKey: R2_SECRET_ACCESS_KEY,
			},
			// Presigned urls only work on this S3 endpoint, never on a custom domain.
			endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
			// Required by the SDK, ignored by R2.
			region: "auto",
		}),
		publicBase: config.R2_PUBLIC_URL?.replace(TRAILING_SLASHES, ""),
	};
}

export function createStorage(config: StorageConfig) {
	const r2 = connect(config);

	function requireR2() {
		if (!r2) {
			throw new Error(NOT_CONFIGURED);
		}
		return r2;
	}

	async function putObject(input: {
		body: Uint8Array;
		contentType: string;
		key: string;
	}): Promise<void> {
		const { bucket, client } = requireR2();
		await client.send(
			new PutObjectCommand({
				Body: input.body,
				Bucket: bucket,
				ContentType: input.contentType,
				Key: input.key,
			})
		);
	}

	/**
	 * A url a client can fetch: the public host when the bucket has one,
	 * otherwise a presigned GET valid for `expiresIn` seconds.
	 */
	async function readUrl(
		key: string,
		expiresIn = READ_TTL_SECONDS
	): Promise<string> {
		const { bucket, client, publicBase } = requireR2();
		if (publicBase) {
			return `${publicBase}/${key}`;
		}
		return await getSignedUrl(
			client,
			new GetObjectCommand({ Bucket: bucket, Key: key }),
			{ expiresIn }
		);
	}

	return {
		/**
		 * Cloudflare dashboard link for the bucket, or for one object when `key`
		 * is given. Needs a signed-in Cloudflare session; it grants nothing.
		 */
		consoleUrl(key?: string): string {
			const { accountId, bucket } = requireR2();
			const base = `https://dash.cloudflare.com/${accountId}/r2/default/buckets/${bucket}`;
			return key ? `${base}/objects/${encodeURIComponent(key)}/details` : base;
		},
		/**
		 * Copy the bytes at `sourceUrl` (for example a temporary url that will
		 * expire) into the bucket under `key`.
		 * Returns what was actually stored. Throws when unconfigured (checked
		 * before the download), when the source is not 200, or when the write
		 * fails; the caller decides whether that is fatal.
		 */
		async copyFrom(
			sourceUrl: string,
			key: string
		): Promise<{ bytes: number; contentType: string; key: string }> {
			requireR2();
			const response = await fetch(sourceUrl, {
				signal: AbortSignal.timeout(SOURCE_FETCH_TIMEOUT_MS),
			});
			if (!response.ok) {
				throw new Error(`Source responded ${response.status} for ${sourceUrl}`);
			}
			const contentType =
				response.headers.get("content-type") ?? "application/octet-stream";
			const body = new Uint8Array(await response.arrayBuffer());
			await putObject({ body, contentType, key });
			return { bytes: body.byteLength, contentType, key };
		},

		async copyObject(fromKey: string, toKey: string): Promise<void> {
			const { bucket, client } = requireR2();
			await client.send(
				new CopyObjectCommand({
					Bucket: bucket,
					CopySource: copySourceFor(bucket, fromKey),
					Key: toKey,
					MetadataDirective: "COPY",
				})
			);
		},

		async deleteObject(key: string): Promise<void> {
			const { bucket, client } = requireR2();
			await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
		},

		/** Size, type and etag of a key without its bytes. Throws when it does not exist. */
		async headObject(
			key: string
		): Promise<{ contentType: string; etag: string; size: number }> {
			const { bucket, client } = requireR2();
			const output = await client.send(
				new HeadObjectCommand({ Bucket: bucket, Key: key })
			);
			if (
				output.ContentLength === undefined ||
				output.ContentType === undefined ||
				output.ETag === undefined
			) {
				throw new Error(`Head response for "${key}" is missing a field`);
			}
			return {
				contentType: output.ContentType,
				etag: output.ETag,
				size: output.ContentLength,
			};
		},
		/** Whether a bucket is configured. Tells a storage-less env from a real failure. */
		isConfigured: r2 !== null,

		/** Every object under `prefix`, page boundaries hidden, without holding the full listing. */
		async *listObjects(prefix: string): AsyncGenerator<StoredObject> {
			const { bucket, client } = requireR2();
			for await (const page of paginateListObjectsV2(
				{ client },
				{ Bucket: bucket, Prefix: prefix }
			)) {
				for (const object of page.Contents ?? []) {
					if (
						object.Key === undefined ||
						object.Size === undefined ||
						object.LastModified === undefined ||
						object.ETag === undefined
					) {
						continue;
					}
					yield {
						etag: object.ETag,
						key: object.Key,
						lastModified: object.LastModified,
						size: object.Size,
					};
				}
			}
		},

		putObject,

		readUrl,

		/**
		 * A one-shot presigned PUT so a client uploads straight to R2. The
		 * server derives `key` (never the client). `content-type` is signed
		 * explicitly: SigV4 presigning leaves non-`x-amz-*` headers unsigned
		 * otherwise, and a client could store HTML under a `.jpg` key.
		 * `Content-Length` is enforced by the signature either way.
		 */
		async uploadUrlFor(input: {
			contentLength: number;
			contentType: string;
			key: string;
			maxBytes?: number;
		}): Promise<{ key: string; uploadUrl: string }> {
			const { bucket, client } = requireR2();
			const maxBytes = input.maxBytes ?? MAX_UPLOAD_BYTES;
			if (input.contentLength > maxBytes) {
				throw new Error(
					`Upload exceeds ${maxBytes} bytes (got ${input.contentLength})`
				);
			}
			const uploadUrl = await getSignedUrl(
				client,
				new PutObjectCommand({
					Bucket: bucket,
					ContentLength: input.contentLength,
					ContentType: input.contentType,
					Key: input.key,
				}),
				{
					expiresIn: UPLOAD_TTL_SECONDS,
					signableHeaders: new Set(["content-type"]),
				}
			);
			return { key: input.key, uploadUrl };
		},
	};
}

export type Storage = ReturnType<typeof createStorage>;
