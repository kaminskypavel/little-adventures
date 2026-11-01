// Pure helpers between the app server's child row and the screens' Profile. No imports of the
// network layer, so they run in tests.
import type { ArtStatus, Profile } from "./types";

/** The fields of the server's child row that the app reads (the real row has more). */
export interface ChildRow {
	age: number;
	artStatus: ArtStatus;
	drawingUrls: { clay?: string };
	faceUrl: string | null;
	grownUp: boolean;
	id: string;
	kind: "girl" | "boy";
	name: string;
	photoKey: string | null;
	puppy: boolean;
}

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

export const rowToProfile = (row: ChildRow): Profile => ({
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
	avatarUrl: string | null;
	/** Absent until the first child is saved. */
	id?: string;
	profile: Profile;
}

/** The caller's first child (the app has one), or the empty profile when there is none yet. */
export const toChild = (rows: ChildRow[]): Child => {
	const [row] = rows;
	return row
		? {
				avatarUrl: row.drawingUrls.clay ?? null,
				id: row.id,
				profile: rowToProfile(row),
			}
		: { avatarUrl: null, profile: { ...emptyProfile } };
};

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
					drawingUrls: {},
					faceUrl: null,
					photoKey: null,
				}
			: row
	);

export interface GrownUpPhoto {
	faceUrl: string | null;
	photoUrl: string;
}

/** The grown-up's own photo (signed url), or null when none is saved. */
export const toGrownUpPhoto = (
	row: { faceUrl?: string | null; photoUrl: string } | null
): GrownUpPhoto | null =>
	row ? { faceUrl: row.faceUrl ?? null, photoUrl: row.photoUrl } : null;
