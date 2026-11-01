import { describe, expect, test } from "bun:test";
import { listenLayout, restLayout } from "./home-layout";

const PHONES = [
	{ height: 667, insets: { bottom: 0, top: 20 } },
	{ height: 844, insets: { bottom: 34, top: 47 } },
	{ height: 932, insets: { bottom: 34, top: 59 } },
];

describe("home layout", () => {
	test("the 390 x 844 design phone lands on the mockup numbers", () => {
		const rest = restLayout(844, { bottom: 34, top: 47 });
		expect(rest.plateBottom).toBe(212);
		expect(rest.starTop).toBe(228);
		expect(rest.starSize).toBe(138);
		expect(rest.buttonCy).toBe(444);
		expect(rest.yoursLabelTop).toBe(528);
		expect(rest.yoursTop).toBe(560);
		expect(rest.ideasLabelTop).toBe(680);
		expect(rest.ideasTop).toBe(712);
		const listen = listenLayout(844, { bottom: 34, top: 47 });
		expect(listen.starTop).toBe(84);
		expect(listen.micCy).toBe(488);
		expect(listen.headlineTop).toBe(646);
		expect(listen.hintTop).toBe(698);
	});

	test("every phone keeps the stack inside the screen, in order", () => {
		for (const { height, insets } of PHONES) {
			const rest = restLayout(height, insets);
			expect(rest.starTop >= rest.plateBottom).toBe(true);
			expect(rest.starSize >= 96).toBe(true);
			expect(rest.yoursLabelTop > rest.buttonCy + 44).toBe(true);
			expect(rest.ideasTop + 88 <= height - insets.bottom).toBe(true);
			const listen = listenLayout(height, insets);
			expect(listen.hintTop + 26 <= height - insets.bottom).toBe(true);
			expect(listen.micCy - 88 > listen.starTop + listen.starSize).toBe(true);
		}
	});
});
