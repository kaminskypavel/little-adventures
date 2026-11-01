import { StyleSheet } from "react-native";
import Animated, {
	Extrapolation,
	interpolate,
	type SharedValue,
	useAnimatedStyle,
} from "react-native-reanimated";
import { ClayPressable } from "./clay-pressable";
import { ClayText } from "./clay-text";
import { Icon, type IconName } from "./icons";
import { useCalm } from "./motion-provider";
import { buttonSizes, colors } from "./tokens";

const PILL = buttonSizes.lg;
const MIC_ICON = 72;
// Of the morph, the label is gone by this much, and the mic shows from this much.
const LABEL_GONE = 0.3;
const MIC_FROM = 0.6;
const clamp = Extrapolation.CLAMP;

/** Where the pill sits: its center on the screen, and (for the pill) its width. */
export interface PillSpot {
	cx: number;
	cy: number;
}

/**
 * The New adventure button that becomes the round mic. `progress` runs 0 (the 88 pt pill at
 * `rest`) to 1 (a `size` pt circle at `mic`): the label fades out first, the pill narrows and
 * grows into the circle and travels, and a mic fades in. Reduced motion: no travel, the pill
 * cross-fades out where it is. At 1 it is hidden, so the voice halo can take its place.
 * `off` is the mic-denied look: off clay, not pressable.
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
	const frame = useAnimatedStyle(() => {
		const p = progress.get();
		if (calm) {
			return {
				height: PILL.primary,
				left: rest.cx - restWidth / 2,
				opacity: 1 - p,
				top: rest.cy - PILL.primary / 2,
				width: restWidth,
			};
		}
		const mix = (a: number, b: number) => interpolate(p, [0, 1], [a, b], clamp);
		const width = mix(restWidth, size);
		const height = mix(PILL.primary, size);
		return {
			height,
			left: mix(rest.cx, mic.cx) - width / 2,
			// At the end the halo takes over, so the pill is not drawn twice.
			opacity: p >= 1 ? 0 : 1,
			top: mix(rest.cy, mic.cy) - height / 2,
			width,
		};
	});
	const labelFade = useAnimatedStyle(() => ({
		opacity: calm
			? 1
			: interpolate(progress.get(), [0, LABEL_GONE], [1, 0], clamp),
	}));
	const micFade = useAnimatedStyle(() => ({
		opacity: calm
			? 0
			: interpolate(progress.get(), [MIC_FROM, 1], [0, 1], clamp),
	}));
	const ink = off ? colors.offInk : colors.inkNavy;

	return (
		<Animated.View
			aria-hidden={listening}
			pointerEvents={off || listening ? "none" : "box-none"}
			style={[styles.frame, frame]}
		>
			<ClayPressable
				accessibilityLabel={label}
				disabled={off || listening}
				onPress={onPress}
				radius={size / 2}
				style={styles.fill}
				tone={off ? "off" : "sun"}
			>
				<Animated.View pointerEvents="none" style={[styles.row, labelFade]}>
					{icon ? <Icon color={ink} name={icon} size={PILL.icon} /> : null}
					<ClayText color={ink} numberOfLines={1} variant="title">
						{label}
					</ClayText>
				</Animated.View>
				<Animated.View pointerEvents="none" style={[styles.row, micFade]}>
					<Icon color={colors.inkNavy} name="mic" size={MIC_ICON} />
				</Animated.View>
			</ClayPressable>
		</Animated.View>
	);
}

const styles = StyleSheet.create({
	fill: { height: "100%", width: "100%" },
	frame: { position: "absolute" },
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
