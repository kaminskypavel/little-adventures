import {
	children as childrenTable,
	type Drawings,
} from "@little-adventures/db/schema/index";
import {
	MODELS,
	MUSE_IMAGE_COST_MICRO_USD,
	SAM_COST_MICRO_USD,
} from "@little-adventures/image-editing";
import { faceCutout } from "@little-adventures/image-editing/cutout";
import {
	LOOKS,
	type Look,
	lookPrompt,
} from "@little-adventures/image-editing/looks";
import { and, eq } from "drizzle-orm";

import { recordAiCall, safetyIdOf } from "./ai-calls";
import type { Context } from "./context";
import { userPrefix } from "./photo-key";

type ArtContext = Pick<Context, "art" | "db" | "storage">;

interface ArtRun {
	childId: string;
	ownerId: string;
	photoKey: string;
}

async function fetchBytes(url: string): Promise<Uint8Array> {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Photo responded ${response.status}`);
	}
	return new Uint8Array(await response.arrayBuffer());
}

/**
 * Draws the child's face cutout and the three looks from the stored photo, in
 * the background. Every row write is guarded by `photo_key`, and the files go
 * in a folder of their own photo, so an older run never overwrites the art of
 * a newer photo. Without a model key the child stays `idle` and nothing is
 * called.
 */
export async function drawArt(
	ctx: ArtContext,
	{ childId, ownerId, photoKey }: ArtRun
): Promise<void> {
	const { art, db, storage } = ctx;
	if (!art.isConfigured) {
		return;
	}
	const current = and(
		eq(childrenTable.id, childId),
		eq(childrenTable.photoKey, photoKey)
	);
	const folder = artFolder(ownerId, childId, photoKey);

	const [started] = await db
		.update(childrenTable)
		.set({ artStatus: "working", drawings: {}, faceKey: null })
		.where(current)
		.returning({ id: childrenTable.id });
	if (!started) {
		return;
	}

	/** One `ai_calls` row per model call, success or failure. */
	const recorded = <T>(
		operation: string,
		model: string,
		costMicroUsd: number,
		call: () => Promise<T>
	) =>
		recordAiCall(
			db,
			{ childId, costMicroUsd, model, operation, ownerId },
			call
		);

	/** A run that lost its row (photo deleted or replaced) must not leave likeness in the bucket. */
	async function dropIfPhotoChanged(keys: string[]) {
		const [row] = await db
			.select({ photoKey: childrenTable.photoKey })
			.from(childrenTable)
			.where(eq(childrenTable.id, childId));
		// The files are this photo's own, so deleting them never touches a newer photo's art.
		if (row?.photoKey !== photoKey) {
			await Promise.all(keys.map((key) => storage.deleteObject(key)));
		}
	}

	async function drawFace(photoUrl: string): Promise<string> {
		const [found, photo] = await Promise.all([
			recorded("face.segment", MODELS.segment, SAM_COST_MICRO_USD, () =>
				art.segment(photoUrl)
			),
			fetchBytes(photoUrl),
		]);
		if (!found) {
			throw new Error("No person found in the photo");
		}
		const key = `${folder}face.png`;
		await storage.putObject({
			body: await faceCutout(photo, found),
			contentType: "image/png",
			key,
		});
		// The client is waiting for the face: save it as soon as it is ready.
		const saved = await db
			.update(childrenTable)
			.set({ faceKey: key })
			.where(current)
			.returning({ id: childrenTable.id });
		if (saved.length === 0) {
			await dropIfPhotoChanged([key]);
		}
		return key;
	}

	async function drawLook(
		look: Look,
		photoUrl: string,
		safetyId: string
	): Promise<string> {
		const png = await recorded(
			`look.${look}`,
			MODELS.redraw,
			MUSE_IMAGE_COST_MICRO_USD,
			() =>
				art.redraw({ imageUrl: photoUrl, prompt: lookPrompt(look), safetyId })
		);
		const key = `${folder}looks/${look}.png`;
		await storage.putObject({ body: png, contentType: "image/png", key });
		return key;
	}

	try {
		const photoUrl = await storage.readUrl(photoKey);
		const safetyId = await safetyIdOf(ownerId);
		const [face, ...looks] = await Promise.allSettled([
			drawFace(photoUrl),
			...LOOKS.map((look) => drawLook(look, photoUrl, safetyId)),
		]);
		const drawings: Drawings = {};
		for (const [index, look] of LOOKS.entries()) {
			const result = looks[index];
			if (result?.status === "fulfilled") {
				drawings[look] = result.value;
			}
		}
		const ready =
			face?.status === "fulfilled" &&
			Object.keys(drawings).length === LOOKS.length;
		const saved = await db
			.update(childrenTable)
			.set({ artStatus: ready ? "ready" : "failed", drawings })
			.where(current)
			.returning({ id: childrenTable.id });
		if (saved.length === 0) {
			await dropIfPhotoChanged([
				...(face?.status === "fulfilled" ? [face.value] : []),
				...Object.values(drawings),
			]);
		}
	} catch (error) {
		await db.update(childrenTable).set({ artStatus: "failed" }).where(current);
		throw error;
	}
}

const photoIdOf = (photoKey: string) =>
	photoKey.slice(photoKey.lastIndexOf("/") + 1).split(".")[0];

/** The folder of one photo's art: a newer photo never shares a file with an older one. */
export function artFolder(
	ownerId: string,
	childId: string,
	photoKey: string
): string {
	return `${userPrefix(ownerId)}children/${childId}/art/${photoIdOf(photoKey)}/`;
}

export const grownUpArtFolder = (ownerId: string, photoKey: string): string =>
	`${userPrefix(ownerId)}grown-up/art/${photoIdOf(photoKey)}/`;

/** Every object key the art of one child holds (face and looks). */
export const artKeys = (
	row: Pick<typeof childrenTable.$inferSelect, "drawings" | "faceKey">
): string[] => [
	...(row.faceKey ? [row.faceKey] : []),
	...Object.values(row.drawings),
];

/** A child row plus signed read urls for its face and looks. */
export async function withArtUrls(
	storage: Pick<Context["storage"], "readUrl">,
	row: typeof childrenTable.$inferSelect
) {
	const [faceUrl, drawn] = await Promise.all([
		row.faceKey ? storage.readUrl(row.faceKey) : null,
		Promise.all(
			Object.entries(row.drawings).map(
				async ([look, key]) => [look, await storage.readUrl(key)] as const
			)
		),
	]);
	return {
		...row,
		drawingUrls: Object.fromEntries(drawn) as Drawings,
		faceUrl,
	};
}
