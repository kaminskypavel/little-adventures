// Pure helpers between the app server's child row and the screens' Profile. No imports of the
// network layer, so they run in tests.
import type { Called } from "@little-adventures/native-ui/called-chips";
import type { ArtStatus, Profile } from "./types";

/** The fields of the server's child row that the app reads (the real row has more). */
export interface ChildRow {
	age: number;
	artStatus: ArtStatus;
	/** The drawn look cut out of its backdrop; older servers leave it out. */
	cutUrl?: string | null;
	/** Storage keys of the drawings: stable, unlike their signed urls. */
	drawings?: { clay?: string };
	drawingUrls: { clay?: string };
	faceUrl: string | null;
	grownUp: boolean;
	id: string;
	kind: "girl" | "boy";
	name: string;
	photoKey: string | null;
	puppy: boolean;
}

/**
 * A signed picture with a stable cache key. The url is signed again on every read, so as a plain
 * url every new read missed the image cache and the picture blinked in again; its storage key never
 * changes, so a picture seen once paints from memory everywhere.
 */
export interface ArtImage {
	cacheKey: string;
	uri: string;
}

const artImage = (
	uri: string | null | undefined,
	key: string | null | undefined
): ArtImage | null => (uri ? { cacheKey: key ?? uri, uri } : null);

/** What `child.save` takes; fields left out stay as they are. */
export interface ChildSave {
	age: number;
	grownUp?: boolean;
	id?: string;
	kind: "girl" | "boy";
	name: string;
	photoKey?: string;
	puppy?: boolean;
}

export const emptyProfile: Profile = {
	artStatus: "idle",
	childAge: null,
	childKind: "boy",
	childName: "",
	grownUp: false,
	hasPhoto: false,
	look: "clay",
	puppy: false,
};

const rowToProfile = (row: ChildRow): Profile => ({
	artStatus: row.artStatus,
	childAge: row.age,
	childKind: row.kind,
	childName: row.name,
	faceUrl: row.faceUrl ?? undefined,
	grownUp: row.grownUp,
	hasPhoto: row.photoKey !== null,
	// A child saved earlier may still say "felt"; only clay is drawn now.
	look: "clay",
	photoKey: row.photoKey ?? undefined,
	puppy: row.puppy,
});

export interface Child {
	/** The clay picture drawn of the child; null until one is drawn. */
	avatar: ArtImage | null;
	/** That picture cut out of its backdrop; null until it is cut. */
	cutUrl: string | null;
	/** Absent until the first child is saved. */
	id?: string;
	profile: Profile;
}

const rowToChild = (row: ChildRow): Child => ({
	avatar: artImage(row.drawingUrls.clay, row.drawings?.clay),
	cutUrl: row.cutUrl ?? null,
	id: row.id,
	profile: rowToProfile(row),
});

/**
 * The current child: the row with `currentId`, else the first (nothing stored, or the stored child
 * is gone). The empty profile when the account has no child yet.
 */
export const toChild = (rows: ChildRow[], currentId?: string | null): Child => {
	const row = rows.find((r) => r.id === currentId) ?? rows[0];
	return row
		? rowToChild(row)
		: { avatar: null, cutUrl: null, profile: { ...emptyProfile } };
};

/** Exactly the child with `id` (no fallback to the first), null when the account has none such. */
export const toChildById = (rows: ChildRow[], id: string): Child | null => {
	const row = rows.find((r) => r.id === id);
	return row ? rowToChild(row) : null;
};

/** Every child of the account, oldest first, as the "Who's listening?" sheet shows them. */
export const toChildren = (rows: ChildRow[]) =>
	rows.map((row) => ({
		avatar: artImage(row.drawingUrls.clay, row.drawings?.clay),
		id: row.id,
		name: row.name,
	}));

/** The cache after `child.save` would have succeeded. A new child waits for the server's row. */
export const applyChildSave = <R extends ChildRow>(
	rows: R[],
	input: ChildSave
): R[] =>
	rows.map((row) =>
		row.id === input.id
			? {
					...row,
					age: input.age,
					grownUp: input.grownUp ?? row.grownUp,
					kind: input.kind,
					name: input.name,
					photoKey: input.photoKey ?? row.photoKey,
					puppy: input.puppy ?? row.puppy,
				}
			: row
	);

/** The cache after `photo.delete` would have succeeded: no photo, face or looks. */
export const clearChildPhoto = <R extends ChildRow>(
	rows: R[],
	childId: string
): R[] =>
	rows.map((row) =>
		row.id === childId
			? {
					...row,
					artStatus: "idle",
					cutUrl: null,
					drawingUrls: {},
					faceUrl: null,
					photoKey: null,
				}
			: row
	);

export interface GrownUpPhoto {
	/** What the child calls the grown-up; null until asked. */
	called: Called | null;
	/** The drawn look cut out of its backdrop; the server adds it after the look. */
	cutUrl?: string | null;
	faceKey?: string | null;
	faceUrl: string | null;
	lookKey?: string | null;
	/** The drawn look of the grown-up; the server adds it, so it may be missing for now. */
	lookUrl?: string | null;
	photoKey?: string;
	photoUrl: string;
}

/** The picture to show for the grown-up: the drawn look, else the face cut-out, else the photo. */
export const grownUpPicture = (photo: GrownUpPhoto) =>
	photo.lookUrl ?? photo.faceUrl ?? photo.photoUrl;

/** The same picture with its storage key as the cache key (see ArtImage). */
export const grownUpImage = (photo: GrownUpPhoto): ArtImage => {
	if (photo.lookUrl) {
		return { cacheKey: photo.lookKey ?? photo.lookUrl, uri: photo.lookUrl };
	}
	if (photo.faceUrl) {
		return { cacheKey: photo.faceKey ?? photo.faceUrl, uri: photo.faceUrl };
	}
	return { cacheKey: photo.photoKey ?? photo.photoUrl, uri: photo.photoUrl };
};

/** The grown-up's own photo (signed url), or null when none is saved. */
export const toGrownUpPhoto = (
	row: {
		calledName?: string | null;
		calledPronoun?: Called["pronoun"] | null;
		calledRelation?: Called["relation"] | null;
		cutUrl?: string | null;
		faceKey?: string | null;
		faceUrl?: string | null;
		lookKey?: string | null;
		lookUrl?: string | null;
		photoKey?: string;
		photoUrl: string;
	} | null
): GrownUpPhoto | null =>
	row
		? {
				called:
					row.calledName && row.calledPronoun && row.calledRelation
						? {
								name: row.calledName,
								pronoun: row.calledPronoun,
								relation: row.calledRelation,
							}
						: null,
				cutUrl: row.cutUrl ?? null,
				faceKey: row.faceKey ?? null,
				faceUrl: row.faceUrl ?? null,
				lookKey: row.lookKey ?? null,
				lookUrl: row.lookUrl ?? null,
				photoKey: row.photoKey,
				photoUrl: row.photoUrl,
			}
		: null;
