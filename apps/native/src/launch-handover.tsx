import { useCalm } from "@little-adventures/native-ui/motion-provider";
import { motion } from "@little-adventures/native-ui/tokens";
import { usePathname } from "expo-router";
import { hideAsync } from "expo-splash-screen";
import { useEffect, useState } from "react";
import { Platform, StyleSheet, useWindowDimensions } from "react-native";
import Animated, {
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

// The splash picture (star over the wordmark) and how iOS shows it: app.json's imageWidth (343) is
// a square the picture is fitted into, so the taller-than-wide picture is 290 pt wide, centred.
const SPLASH = require("@/assets/images/splash-ios.png");
const SPLASH_RATIO = 916 / 774;
const SPLASH_WIDTH = 343 / SPLASH_RATIO;
const SPLASH_COLOR = "#0A1B34";
// The same pair on Welcome: full size (the wordmark is 387 pt wide), the star's top 128 pt down.
const WELCOME_WIDTH = 387;
const WELCOME_TOP = 128;
const GLIDE_MS = 520;
const FADE_MS = 260;
const ease = Easing.bezier(...motion.easeOut);

/**
 * Takes over from the native splash with the same picture, then hands over to the first screen:
 * on Welcome the star and wordmark grow and glide up into Welcome's own while the sky fades in,
 * and fade into the live ones; anywhere else (signed in, reduced motion) it simply fades. Not on
 * the web, which has no splash.
 */
export function LaunchHandover() {
	const calm = useCalm();
	const pathname = usePathname();
	const { height, width } = useWindowDimensions();
	const [gone, setGone] = useState(Platform.OS === "web");
	const glide = useSharedValue(0);
	const fade = useSharedValue(1);

	// The overlay now shows exactly what the native splash shows, so the native one can go.
	useEffect(() => {
		hideAsync();
	}, []);

	// "/" is the start page deciding where to go; the hand-over waits for the real first screen.
	const decided = pathname !== "/";
	useEffect(() => {
		if (gone || !decided) {
			return;
		}
		const toWelcome = pathname === "/welcome" && !calm;
		if (toWelcome) {
			glide.set(withTiming(1, { duration: GLIDE_MS, easing: ease }));
		}
		fade.set(
			withDelay(
				toWelcome ? GLIDE_MS : 0,
				withTiming(0, { duration: FADE_MS }, (done) => {
					if (done) {
						scheduleOnRN(setGone, true);
					}
				})
			)
		);
	}, [calm, decided, fade, glide, gone, pathname]);

	const startH = SPLASH_WIDTH * SPLASH_RATIO;
	const endH = WELCOME_WIDTH * SPLASH_RATIO;
	const startTop = (height - startH) / 2;

	const sky = useAnimatedStyle(() => ({
		// The sky shows through as the pair glides; without a glide it fades with the picture.
		opacity: Math.min(1 - glide.get(), fade.get()),
	}));
	const picture = useAnimatedStyle(() => {
		const g = glide.get();
		const w = SPLASH_WIDTH + (WELCOME_WIDTH - SPLASH_WIDTH) * g;
		const h = startH + (endH - startH) * g;
		const top = startTop + (WELCOME_TOP - startTop) * g;
		return {
			opacity: fade.get(),
			transform: [
				{ translateY: top + h / 2 - height / 2 },
				{ scale: w / SPLASH_WIDTH },
			],
		};
	});

	if (gone) {
		return null;
	}
	return (
		<Animated.View pointerEvents="none" style={StyleSheet.absoluteFill}>
			<Animated.View style={[StyleSheet.absoluteFill, styles.sky, sky]} />
			<Animated.Image
				source={SPLASH}
				style={[
					styles.picture,
					{
						height: startH,
						left: (width - SPLASH_WIDTH) / 2,
						top: startTop,
						width: SPLASH_WIDTH,
					},
					picture,
				]}
			/>
		</Animated.View>
	);
}

const styles = StyleSheet.create({
	picture: { position: "absolute" },
	sky: { backgroundColor: SPLASH_COLOR },
});
