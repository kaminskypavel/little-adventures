import { describe, expect, test } from "bun:test";
import {
	applyChildSave,
	type ChildRow,
	clearChildPhoto,
	emptyProfile,
	toChild,
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
		expect(child.avatarUrl).toBe("https://x/clay.png");
		expect(child.profile.childName).toBe("Mia");
		expect(child.profile.hasPhoto).toBe(true);
		expect(child.profile.faceUrl).toBe("https://x/face.png");
	});

	test("no row gives the empty profile", () => {
		expect(toChild([])).toEqual({
			avatarUrl: null,
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

	test("the grown-up photo maps a missing face to null", () => {
		expect(toGrownUpPhoto(null)).toBe(null);
		expect(toGrownUpPhoto({ photoUrl: "p" })).toEqual({
			faceUrl: null,
			photoUrl: "p",
		});
	});
});
