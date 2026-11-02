import {
	BODY_FADE_KEYBOARD,
	type BodyMask,
} from "@little-adventures/native-ui/body-fade";
import MaskedView from "@react-native-masked-view/masked-view";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View } from "react-native";
import { useReanimatedKeyboardAnimation } from "react-native-keyboard-controller";
import Animated, { useAnimatedStyle } from "react-native-reanimated";

const SOLID = "#000";
const CLEAR = "rgba(0,0,0,0)";

/**
 * The native body fade (iOS and Android): MaskedView reads only the alpha of its mask, so the
 * first `top` pt fade in and the last `height` pt fade to nothing. Web uses a CSS mask inside `Screen`.
 *
 * While the keyboard is up the body ends just above the docked actions (see `Screen`), so the
 * bottom fade shortens to BODY_FADE_KEYBOARD with the keyboard's own animation: the full fade
 * would turn the buttons above the dock see-through, with the sky's clouds showing through them.
 */
export const FadeBottom: BodyMask = ({ children, height, top }) => {
	const { progress } = useReanimatedKeyboardAnimation();
	const bottomFade = useAnimatedStyle(() => ({
		height: height + (BODY_FADE_KEYBOARD - height) * progress.get(),
	}));
	return (
		<MaskedView
			androidRenderingMode="software"
			maskElement={
				<View style={styles.fill}>
					{top > 0 ? (
						<LinearGradient colors={[CLEAR, SOLID]} style={{ height: top }} />
					) : null}
					<View style={styles.solid} />
					{height > 0 ? (
						<Animated.View style={bottomFade}>
							<LinearGradient colors={[SOLID, CLEAR]} style={styles.fill} />
						</Animated.View>
					) : null}
				</View>
			}
			style={styles.fill}
		>
			{children}
		</MaskedView>
	);
};

const styles = StyleSheet.create({
	fill: { backgroundColor: "transparent", flex: 1 },
	solid: { backgroundColor: SOLID, flex: 1 },
});
