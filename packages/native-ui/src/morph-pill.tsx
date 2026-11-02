import { StyleSheet } from "react-native";
import Animated, {
	Extrapolation,
	interpolate,
	type SharedValue,
	useAnimatedStyle,
} from "react-native-reanimated";
import { ClayPressable } from "./clay-pressable";
import { ClaySurface } from "./clay-surface";
import { ClayText } from "./clay-text";
import { Icon, type IconName } from "./icons";
import { useCalm } from "./motion-provider";
import { buttonSizes, colors } from "./tokens";

const PILL = buttonSizes.lg;
const MIC_ICON = 72;
// Of the morph: the label is gone by LABEL_GONE, the pill's clay hands over to the circle's over
// SWAP, and the mic shows over MIC_IN, once the shape is nearly round. Words and icon never meet.
const LABEL_GONE = 0.2;
const SWAP: [number, number] = [0.15, 0.5];
const MIC_IN: [number, number] = [0.55, 0.85];
const clamp = Extrapolation.CLAMP;

/** Where the pill sits: its center on the screen, and (for the pill) its width. */
export interface PillSpot {
	cx: number;
	cy: number;
}

/**
 * The New adventure button that becomes the round mic. `progress` runs 0 (the 88 pt pill at
 * `rest`) to 1 (a `size` pt circle at `mic`). The shape between them is drawn by two finished
 * pieces of clay, the pill and the circle, both stretched to the in-between size and position
 * and cross-faded: transforms and opacity only, so the GPU reuses their drawn shadows and nothing
 * is laid out again on any frame. Reduced motion: no travel, the pill cross-fades out where it
 * is. At 1 it is hidden, so the voice halo can take its place. `off` is the mic-denied look: off
 * clay, not pressable.
 */
export function MorphPill({
	icon,
	label,
	listening = false,
	mic,
	off = false,
	onPress,
	progress,
	rest,
	restWidth,
	size,
}: {
	icon?: IconName;
	label: string;
	/** True once the morph has started: the pill takes no touches. */
	listening?: boolean;
	mic: PillSpot;
	off?: boolean;
	onPress: () => void;
	progress: SharedValue<number>;
	rest: PillSpot;
	restWidth: number;
	/** The circle's diameter at progress 1. */
	size: number;
}) {
	const calm = useCalm();

	// The in-between box at `p`: its size and its center.
	const between = (p: number) => {
		"worklet";
		const mix = (a: number, b: number) => interpolate(p, [0, 1], [a, b], clamp);
		return {
			cx: mix(rest.cx, mic.cx),
			cy: mix(rest.cy, mic.cy),
			height: mix(PILL.primary, size),
			width: mix(restWidth, size),
		};
	};

	const pill = useAnimatedStyle(() => {
		const p = progress.get();
		if (calm) {
			return { opacity: 1 - p };
		}
		const box = between(p);
		return {
			opacity: interpolate(p, SWAP, [1, 0], clamp),
			transform: [
				{ translateX: box.cx - rest.cx },
				{ translateY: box.cy - rest.cy },
				{ scaleX: box.width / restWidth },
				{ scaleY: box.height / PILL.primary },
			],
		};
	});

	const circle = useAnimatedStyle(() => {
		const p = progress.get();
		if (calm || p >= 1) {
			// At the end the halo takes over, so the circle is not drawn twice.
			return { opacity: 0 };
		}
		const box = between(p);
		return {
			opacity: interpolate(p, SWAP, [0, 1], clamp),
			transform: [
				{ translateX: box.cx - mic.cx },
				{ translateY: box.cy - mic.cy },
				{ scaleX: box.width / size },
				{ scaleY: box.height / size },
			],
		};
	});

	const labelFade = useAnimatedStyle(() => ({
		opacity: calm
			? 1
			: interpolate(progress.get(), [0, LABEL_GONE], [1, 0], clamp),
	}));
	const micFade = useAnimatedStyle(() => ({
		opacity: interpolate(progress.get(), MIC_IN, [0, 1], clamp),
	}));

	const ink = off ? colors.offInk : colors.inkNavy;

	return (
		<>
			<Animated.View
				pointerEvents="none"
				style={[
					styles.abs,
					{
						height: size,
						left: mic.cx - size / 2,
						top: mic.cy - size / 2,
						width: size,
					},
					circle,
				]}
			>
				<ClaySurface
					radius={size / 2}
					style={StyleSheet.absoluteFill}
					tone="sun"
				/>
				<Animated.View style={[styles.row, micFade]}>
					<Icon color={colors.inkNavy} name="mic" size={MIC_ICON} />
				</Animated.View>
			</Animated.View>
			<Animated.View
				aria-hidden={listening}
				pointerEvents={off || listening ? "none" : "box-none"}
				style={[
					styles.abs,
					{
						height: PILL.primary,
						left: rest.cx - restWidth / 2,
						top: rest.cy - PILL.primary / 2,
						width: restWidth,
					},
					pill,
				]}
			>
				<ClayPressable
					accessibilityLabel={label}
					disabled={off || listening}
					onPress={onPress}
					radius={PILL.primary / 2}
					style={styles.fill}
					tone={off ? "off" : "sun"}
				>
					<Animated.View pointerEvents="none" style={[styles.row, labelFade]}>
						{icon ? <Icon color={ink} name={icon} size={PILL.icon} /> : null}
						<ClayText color={ink} numberOfLines={1} variant="title">
							{label}
						</ClayText>
					</Animated.View>
				</ClayPressable>
			</Animated.View>
		</>
	);
}

const styles = StyleSheet.create({
	abs: { position: "absolute" },
	fill: { height: "100%", width: "100%" },
	row: {
		alignItems: "center",
		bottom: 0,
		flexDirection: "row",
		gap: PILL.gap,
		justifyContent: "center",
		left: 0,
		position: "absolute",
		right: 0,
		top: 0,
	},
});
