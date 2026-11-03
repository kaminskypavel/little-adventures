import { describe, expect, test } from "bun:test";
import {
	applyChildSave,
	type ChildRow,
	clearChildPhoto,
	emptyProfile,
	removeChild,
	toChild,
	toChildren,
	toGrownUpPhoto,
} from "./profile-map";

const row: ChildRow = {
	age: 6,
	artStatus: "ready",
	drawingUrls: { clay: "https://x/clay.png" },
	faceUrl: "https://x/face.png",
	grownUp: false,
	id: "c1",
	kind: "girl",
	name: "Mia",
	photoKey: "u/photo.jpg",
	puppy: true,
};

describe("profile map", () => {
	test("a row becomes a profile with its avatar", () => {
		const child = toChild([row]);
		expect(child.id).toBe("c1");
		expect(child.avatar?.uri).toBe("https://x/clay.png");
		expect(child.profile.childName).toBe("Mia");
		expect(child.profile.hasPhoto).toBe(true);
		expect(child.profile.faceUrl).toBe("https://x/face.png");
	});

	test("no row gives the empty profile", () => {
		expect(toChild([])).toEqual({
			avatar: null,
			cutUrl: null,
			profile: emptyProfile,
		});
	});

	test("a save changes only the matching child and keeps unset fields", () => {
		const other = { ...row, id: "c2" };
		const [a, b] = applyChildSave([row, other], {
			age: 7,
			id: "c1",
			kind: "boy",
			name: "Sam",
		});
		expect(a).toEqual({ ...row, age: 7, kind: "boy", name: "Sam" });
		expect(b).toBe(other);
	});

	test("deleting the photo clears face and looks", () => {
		const [a] = clearChildPhoto([row], "c1");
		expect(a?.photoKey).toBe(null);
		expect(a?.faceUrl).toBe(null);
		expect(a?.drawingUrls).toEqual({});
		expect(a?.artStatus).toBe("idle");
	});

	test("deleting a child drops it from the list and the pickers fall back", () => {
		const other = { ...row, id: "c2", name: "Sam" };
		const left = removeChild([row, other], "c1");
		expect(left).toEqual([other]);
		expect(toChildren(left).map((c) => c.id)).toEqual(["c2"]);
		// The deleted child was the current one: the first child left is used.
		expect(toChild(left, "c1").id).toBe("c2");
		// The last child deleted: the empty profile, so the add-child flow starts.
		expect(toChild(removeChild([row], "c1"), "c1")).toEqual({
			avatar: null,
			cutUrl: null,
			profile: emptyProfile,
		});
	});

	test("the grown-up photo maps a missing face and cut-out to null", () => {
		expect(toGrownUpPhoto(null)).toBe(null);
		expect(toGrownUpPhoto({ photoUrl: "p" })).toEqual({
			called: null,
			cutUrl: null,
			faceKey: null,
			faceUrl: null,
			lookKey: null,
			lookUrl: null,
			photoUrl: "p",
		});
	});

	test("the grown-up photo carries what the child calls them, only when all three are set", () => {
		const photo = { photoUrl: "p" };
		expect(
			toGrownUpPhoto({
				...photo,
				calledName: "Abba",
				calledPronoun: "he",
				calledRelation: "other",
			})?.called
		).toEqual({ name: "Abba", pronoun: "he", relation: "other" });
		expect(toGrownUpPhoto({ ...photo, calledName: "Abba" })?.called).toBe(null);
	});
});
