// A Magic Trackpad flick made during the last one's momentum arrives without a pause in
// the wheel events, so a new flick shows only as a sharp rise in speed after the decay.
const MIN_SPEED = 40; // px per event; slow drags stay below it
const RISE = 2.5; // a flick is this much faster than the slowest event since the last one
const SETTLE_MS = 200; // a flick's own ramp-up and stray spikes never count twice
const GAP_MS = 150; // after a pause, any real movement is a new flick

export const createFlickSensor = () => {
	let low = 0;
	let flickAt = Number.NEGATIVE_INFINITY;
	let lastAt = Number.NEGATIVE_INFINITY;
	return {
		/** A move just started: the flick that started it is spent. */
		claim: (time: number) => {
			flickAt = time;
		},
		/** One wheel event; true when it starts a new flick. */
		sense: (speed: number, time: number) => {
			if (time - lastAt >= GAP_MS) {
				low = 0;
			}
			lastAt = time;
			if (time - flickAt < SETTLE_MS) {
				low = speed;
				return false;
			}
			low = Math.min(low, speed);
			if (speed < MIN_SPEED || speed < RISE * low) {
				return false;
			}
			flickAt = time;
			low = speed;
			return true;
		},
	};
};
