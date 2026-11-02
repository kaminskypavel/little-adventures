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
	avatarUrl: string | null;
	/** That picture cut out of its backdrop; null until it is cut. */
	cutUrl: string | null;
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
				cutUrl: row.cutUrl ?? null,
				id: row.id,
				profile: rowToProfile(row),
			}
		: { avatarUrl: null, cutUrl: null, profile: { ...emptyProfile } };
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
	faceUrl: string | null;
	/** The drawn look of the grown-up; the server adds it, so it may be missing for now. */
	lookUrl?: string | null;
	photoUrl: string;
}

/** The picture to show for the grown-up: the drawn look, else the face cut-out, else the photo. */
export const grownUpPicture = (photo: GrownUpPhoto) =>
	photo.lookUrl ?? photo.faceUrl ?? photo.photoUrl;

/** The grown-up's own photo (signed url), or null when none is saved. */
export const toGrownUpPhoto = (
	row: {
		calledName?: string | null;
		calledPronoun?: Called["pronoun"] | null;
		calledRelation?: Called["relation"] | null;
		cutUrl?: string | null;
		faceUrl?: string | null;
		lookUrl?: string | null;
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
				faceUrl: row.faceUrl ?? null,
				lookUrl: row.lookUrl ?? null,
				photoUrl: row.photoUrl,
			}
		: null;
