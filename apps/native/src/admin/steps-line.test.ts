import { expect, test } from "bun:test";

import { stepsLine } from "./steps-line";

test("the confirm line names the steps that spend and the ones that are off", () => {
	expect(
		stepsLine({ pictures: true, story: true, video: false, voice: true })
	).toBe("Real calls: story, pictures, voice. Off: video.");
	expect(
		stepsLine({ pictures: true, story: true, video: true, voice: true })
	).toBe("Real calls: story, pictures, voice, video.");
});
