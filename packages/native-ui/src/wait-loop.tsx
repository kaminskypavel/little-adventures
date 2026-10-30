import { LinearGradient } from "expo-linear-gradient";
import { useVideoPlayer, VideoView } from "expo-video";
import { useCallback, useEffect, useState } from "react";
import { type LayoutChangeEvent, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { useCalm } from "./motion-provider";
import { motion } from "./tokens";

// Round 7 `.shade` and `.rdim` on the wait screen: navy at these strengths.
const shade = {
	colors: [
		"rgba(10,22,44,0.6)",
		"rgba(10,22,44,0.1)",
		"rgba(10,22,44,0.1)",
		"rgba(10,22,44,0.45)",
	],
	locations: [0, 0.28, 0.6, 1],
} as const;
const AWAY_MS = 400;
const AWAY_EASE = `cubic-bezier(${motion.easeOut.join(",")})`;
// The loop plays 2.5 times faster while the last stretch of the bar fills.
const FAST_RATE = 2.5;
const READY_POLL_MS = 50;
// The loop file is 416 x 928. It is sized to cover the screen and centered, which the web
// video element does not do on its own (it keeps its own aspect and sticks to the top).
const VIDEO = { height: 928, width: 416 } as const;

/**
 * 10a: the full-bleed loop of the star and the puppy playing, with a soft navy shade for the
 * title and the bar. `fast` speeds the loop up, `away` fades the loop and its shade out for the
 * ready screen (the sky behind is left as it is) and pauses it. Under reduced motion the loop
 * holds its first frame.
 */
export function WaitLoop({
	away = false,
	fast = false,
	source,
}: {
	away?: boolean;
	fast?: boolean;
	/** A require()'d video module. */
	source: number;
}) {
	const calm = useCalm();
	const [box, setBox] = useState({ height: 0, width: 0 });
	const onLayout = useCallback((event: LayoutChangeEvent) => {
		const { height, width } = event.nativeEvent.layout;
		setBox({ height, width });
	}, []);
	const scale = Math.max(box.width / VIDEO.width, box.height / VIDEO.height);
	const player = useVideoPlayer(source, (created) => {
		created.loop = true;
		created.muted = true;
	});

	// Started here and not in the setup above: on web the player only has a video element once mounted.
	const laidOut = box.width > 0;
	useEffect(() => {
		if (laidOut) {
			player.play();
		}
	}, [laidOut, player]);

	useEffect(() => {
		player.playbackRate = fast ? FAST_RATE : 1;
	}, [fast, player]);

	// Reduced motion: let the first frame load, then stop on it. Polled, because on web the load
	// events can fire before the player has attached its listeners.
	useEffect(() => {
		if (!calm) {
			return;
		}
		const timer = setInterval(() => {
			if (player.status === "readyToPlay" || player.bufferedPosition > 0) {
				clearInterval(timer);
				player.pause();
				player.currentTime = 0;
			}
		}, READY_POLL_MS);
		return () => clearInterval(timer);
	}, [calm, player]);

	// Pause once the fade has finished, so nothing keeps decoding behind the sky.
	const awayMs = calm ? motion.reducedReveal : AWAY_MS;
	useEffect(() => {
		if (!away) {
			return;
		}
		const timer = setTimeout(() => player.pause(), awayMs);
		return () => clearTimeout(timer);
	}, [away, awayMs, player]);

	const fade = {
		opacity: away ? 0 : 1,
		transitionDuration: `${awayMs}ms`,
		transitionProperty: "opacity",
		transitionTimingFunction: AWAY_EASE,
	} as const;

	return (
		<Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, fade]}>
			<View
				onLayout={onLayout}
				pointerEvents="none"
				style={[StyleSheet.absoluteFill, styles.stage]}
			>
				{laidOut ? (
					<VideoView
						allowsPictureInPicture={false}
						contentFit="cover"
						nativeControls={false}
						player={player}
						playsInline
						pointerEvents="none"
						style={{
							height: VIDEO.height * scale,
							maxWidth: VIDEO.width * scale,
							width: VIDEO.width * scale,
						}}
						surfaceType="textureView"
					/>
				) : null}
			</View>
			<LinearGradient
				colors={shade.colors}
				locations={shade.locations}
				pointerEvents="none"
				style={StyleSheet.absoluteFill}
			/>
		</Animated.View>
	);
}

const styles = StyleSheet.create({
	stage: { alignItems: "center", justifyContent: "center", overflow: "hidden" },
});
