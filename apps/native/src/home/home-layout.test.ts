import { describe, expect, test } from "bun:test";
import { listenLayout, restLayout } from "./home-layout";

const PHONES = [
	{ height: 667, insets: { bottom: 0, top: 20 } },
	{ height: 844, insets: { bottom: 34, top: 47 } },
	{ height: 932, insets: { bottom: 34, top: 59 } },
];

describe("home layout", () => {
	test("the 390 x 844 design phone: Yours at the bottom at rest, the ideas under the mic", () => {
		const rest = restLayout(844, { bottom: 34, top: 47 });
		expect(rest.starSize).toBe(190);
		expect(Math.round(rest.buttonCy)).toBe(533);
		expect(Math.round(rest.yoursTop)).toBe(685);
		const listen = listenLayout(844, { bottom: 34, top: 47 });
		expect(listen.starTop).toBe(84);
		expect(Math.round(listen.micCy)).toBe(426);
		expect(Math.round(listen.hintTop)).toBe(614);
		expect(Math.round(listen.ideasTop)).toBe(709);
	});

	test("every phone keeps the stack inside the screen, in order", () => {
		for (const { height, insets } of PHONES) {
			const rest = restLayout(height, insets);
			expect(rest.starTop >= rest.plateBottom).toBe(true);
			expect(rest.starSize >= 96).toBe(true);
			expect(rest.yoursLabelTop > rest.buttonCy + 44).toBe(true);
			expect(rest.yoursTop + 96 + 10 <= height - insets.bottom).toBe(true);
			const listen = listenLayout(height, insets);
			expect(listen.ideasLabelTop >= listen.hintTop + 26).toBe(true);
			expect(listen.ideasTop + 88 <= height - insets.bottom).toBe(true);
			expect(listen.micCy - 88 > listen.starTop + listen.starSize).toBe(true);
		}
	});
});
