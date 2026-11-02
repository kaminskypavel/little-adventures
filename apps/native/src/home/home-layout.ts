// Home's vertical layout, from the window height and the safe-area insets alone (no onLayout, so
// nothing jumps). The numbers are the 390 x 844 design phone (47 pt top inset, 34 pt bottom).
// The star and the gaps give way first on a short phone; a tall phone spreads the extra space over
// the gaps in the same proportions as the design.

export interface Insets {
	bottom: number;
	top: number;
}

// The top bar row: 8 below the inset, 64 high.
const BAR = 72;
const PLATE = 88;
const TAIL = 14;
const BUTTON = 88;
const LABEL = 23;
const LABEL_GAP = 9;
const DOOR = 96;
const CHIP = 10;
const IDEA = 88;
// With Yours as the only shelf the star has Round 1's room again (190 at most).
const STAR = { max: 190, min: 96 };
// Gaps: bar to plate, tail to star, star to button, button to Yours, Yours shelf to the bottom.
const REST_GAPS = [5, 2, 34, 40, 10] as const;

const MIC = 176;
const HEADLINE = 42;
const HINT_GAP = 10;
const HINT = 26;
const LISTEN_STAR = { max: 150, min: 110 };
const LISTEN_TOP = 37;
// Star to mic, mic to headline, hint to the ideas' label, ideas to the bottom edge.
const LISTEN_GAPS = [96, 44, 34, 12] as const;

// The gaps never shrink below this share of the design before the star starts to shrink.
const GAP_FLOOR = 0.5;

const sum = (list: readonly number[]) => list.reduce((a, b) => a + b, 0);

/**
 * Splits `free` pt (what is left with the star at full size) between the star and the gaps: the
 * gaps shrink to half the design first, then the star shrinks to its minimum, then the gaps go on
 * shrinking. Extra space is shared by the gaps in the design's proportions.
 */
function fit(
	free: number,
	star: { max: number; min: number },
	weights: readonly number[]
) {
	const total = sum(weights);
	const short = total * GAP_FLOOR - free;
	const size = short > 0 ? Math.max(star.min, star.max - short) : star.max;
	const k = Math.max(0, (free + star.max - size) / total);
	return { gaps: weights.map((w) => w * k), size };
}

export interface RestLayout {
	buttonCy: number;
	plateBottom: number;
	starSize: number;
	starTop: number;
	yoursLabelTop: number;
	yoursTop: number;
}

/** Home at rest: plate, star, the New adventure button, then the Yours shelf. */
export function restLayout(height: number, insets: Insets): RestLayout {
	const barBottom = insets.top + BAR;
	const fixed = PLATE + TAIL + BUTTON + LABEL + LABEL_GAP + DOOR + CHIP;
	const free = height - barBottom - insets.bottom - fixed - STAR.max;
	const { gaps, size } = fit(free, STAR, REST_GAPS);
	const plateBottom = barBottom + (gaps[0] ?? 0) + PLATE;
	const starTop = plateBottom + TAIL + (gaps[1] ?? 0);
	const buttonTop = starTop + size + (gaps[2] ?? 0);
	const yoursLabelTop = buttonTop + BUTTON + (gaps[3] ?? 0);
	return {
		buttonCy: buttonTop + BUTTON / 2,
		plateBottom,
		starSize: size,
		starTop,
		yoursLabelTop,
		yoursTop: yoursLabelTop + LABEL + LABEL_GAP,
	};
}

export interface ListenLayout {
	headlineTop: number;
	hintTop: number;
	ideasLabelTop: number;
	ideasTop: number;
	micCy: number;
	starSize: number;
	starTop: number;
}

/** Home after New adventure: the star on top, the round mic, the words, then the ideas. */
export function listenLayout(height: number, insets: Insets): ListenLayout {
	const starTop = insets.top + LISTEN_TOP;
	const fixed = MIC + HEADLINE + HINT_GAP + HINT + LABEL + LABEL_GAP + IDEA;
	const free = height - insets.bottom - starTop - LISTEN_STAR.max - fixed;
	const { gaps, size } = fit(free, LISTEN_STAR, LISTEN_GAPS);
	const micTop = starTop + size + (gaps[0] ?? 0);
	const headlineTop = micTop + MIC + (gaps[1] ?? 0);
	const hintTop = headlineTop + HEADLINE + HINT_GAP;
	const ideasLabelTop = hintTop + HINT + (gaps[2] ?? 0);
	return {
		headlineTop,
		hintTop,
		ideasLabelTop,
		ideasTop: ideasLabelTop + LABEL + LABEL_GAP,
		micCy: micTop + MIC / 2,
		starSize: size,
		starTop,
	};
}
