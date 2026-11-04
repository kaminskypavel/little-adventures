import { useState } from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { EaseView } from "react-native-ease";
import { iosTextNudge } from "./clay-text";
import { useCalm } from "./motion-provider";
import { fonts } from "./tokens";

// Round 7 `.lgc`: 46 px at 0.72 scale = 64 pt. Letter spacing -0.01em. The bob is 3 px = 4.2 pt.
const SIZE = 64;
const SPACING = -0.64;
const BOB = 4.2;
const BOB_MS = 3600;
const STEP_S = 0.09;
// Room kept on each side of the mark; the tilted letters reach a few points past their boxes.
const SIDE = 32;
// Two shadows per letter: a hard navy lip (0 3 px) and a soft drop (0 6 px, 14 px blur).
const LIP = { color: "rgba(4,10,24,0.55)", y: 4.2 };
const DROP = { blur: 19.4, color: "rgba(0,0,0,0.35)", y: 8.3 };

// Wordmark palette: sun, sky, leaf, tangerine, teal, butter, then the cycle repeats.
const palette = [
	"#FFC83D",
	"#7EC8F0",
	"#8FD694",
	"#FF9F5A",
	"#4FD1C5",
	"#FFE08A",
] as const;

// [letter, palette index, tilt in degrees] straight from round 7's markup.
const spec = [
	[
		["L", 0, -5],
		["i", 1, 3],
		["t", 2, -2],
		["t", 3, 4],
		["l", 4, -3],
		["e", 5, 2],
	],
	[
		["A", 0, -4],
		["d", 1, 3],
		["v", 2, -2],
		["e", 3, 5],
		["n", 4, -5],
		["t", 5, 3],
		["u", 0, -2],
		["r", 1, 4],
		["e", 2, -3],
		["s", 3, 2],
	],
] as const;

interface Letter {
	ch: string;
	color: string;
	/** Bob delay in seconds, 0.09 s per letter across both lines. */
	delay: number;
	tilt: number;
}

let count = 0;
const lines: Letter[][] = spec.map((line) =>
	line.map(([ch, color, tilt]) => {
		const delay = Math.round(count * STEP_S * 100) / 100;
		count += 1;
		return { ch, color: palette[color], delay, tilt };
	})
);

const glyph = [
	{
		fontFamily: fonts.heavy,
		fontSize: SIZE,
		letterSpacing: SPACING,
		lineHeight: SIZE,
	},
	iosTextNudge({ fontSize: SIZE, lineHeight: SIZE }),
];

/**
 * The bob (0, up BOB, back, ease-in-out) runs on the platform's own animator (react-native-ease:
 * Core Animation on iOS, ObjectAnimator on Android, CSS on the web). As Reanimated CSS animations
 * the 16 letters made it rebuild the screen's view tree on every frame.
 */
function Glyph({ calm, letter }: { calm: boolean; letter: Letter }) {
	const { color } = letter;
	return (
		<EaseView
			animate={{ translateY: calm ? 0 : -BOB }}
			initialAnimate={{ translateY: 0 }}
			transition={
				calm
					? { type: "none" }
					: {
							delay: letter.delay * 1000,
							duration: BOB_MS / 2,
							easing: "easeInOut",
							loop: "reverse",
							type: "timing",
						}
			}
		>
			<View style={{ transform: [{ rotate: `${letter.tilt}deg` }] }}>
				<Text
					allowFontScaling={false}
					style={[
						...glyph,
						{
							color,
							textShadowColor: DROP.color,
							textShadowOffset: { height: DROP.y, width: 0 },
							textShadowRadius: DROP.blur,
						},
					]}
				>
					{letter.ch}
				</Text>
				<Text
					allowFontScaling={false}
					style={[
						...glyph,
						StyleSheet.absoluteFill,
						{
							color,
							textShadowColor: LIP.color,
							textShadowOffset: { height: LIP.y, width: 0 },
							textShadowRadius: 0,
						},
					]}
				>
					{letter.ch}
				</Text>
			</View>
		</EaseView>
	);
}

/**
 * The Welcome wordmark: "Little" over "Adventures", each letter its own colour, tilt and bob. On a
 * phone where "Adventures" would run past the side margins (Android draws the font wider), the
 * whole mark scales down to fit.
 */
export function Logo() {
	const calm = useCalm();
	const { width } = useWindowDimensions();
	const [natural, setNatural] = useState(0);
	const room = width - 2 * SIDE;
	const scale = natural > room ? room / natural : 1;
	return (
		<View
			accessibilityLabel="Little Adventures"
			accessibilityRole="header"
			accessible
			style={{ flexDirection: "row", justifyContent: "center" }}
		>
			{/* A child of a row keeps its full width (it does not shrink), so this measures the
			    mark as drawn, not as clamped to the screen. */}
			<View
				onLayout={(event) => setNatural(event.nativeEvent.layout.width)}
				style={{ transform: [{ scale }] }}
			>
				{lines.map((line) => (
					<View
						key={line.map((letter) => letter.ch).join("")}
						style={{ flexDirection: "row", justifyContent: "center" }}
					>
						{line.map((letter) => (
							<Glyph calm={calm} key={letter.delay} letter={letter} />
						))}
					</View>
				))}
			</View>
		</View>
	);
}
