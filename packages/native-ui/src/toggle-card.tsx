import { type StyleProp, View, type ViewStyle } from "react-native";
import Animated, { cubicBezier } from "react-native-reanimated";
import { Character } from "./character";
import { ClayPressable } from "./clay-pressable";
import { ClayText } from "./clay-text";
import { Icon } from "./icons";
import { useCalm } from "./motion-provider";
import { colors, motion, radii, select } from "./tokens";

const PUPPY_WIDTH = 0.92;
const PUPPY_NUDGE = 0.06;
const easeOut = cubicBezier(...motion.easeOut);
const overshoot = cubicBezier(...motion.overshoot);

/** You / Puppy: avatar, two text lines, and an on / off disc at the right edge. */
export function ToggleCard({
	avatar,
	on,
	onPress,
	style,
	subtitle,
	title,
}: {
	avatar: "puppy" | "you";
	on: boolean;
	onPress?: () => void;
	style?: StyleProp<ViewStyle>;
	subtitle: string;
	title: string;
}) {
	const calm = useCalm();
	const ms = (n: number) => (calm ? 0 : n);

	return (
		<ClayPressable
			accessibilityLabel={`${title}, ${subtitle}`}
			accessibilityRole="switch"
			accessibilityState={{ checked: on }}
			onPress={onPress}
			radius={radii.card}
			selected={on}
			style={[
				{
					alignItems: "center",
					flexDirection: "row",
					gap: select.toggleGap,
					height: select.toggleHeight,
					paddingLeft: select.togglePadLeft,
					paddingRight: select.togglePadRight,
				},
				style,
			]}
			tone="sage"
		>
			<View
				style={{
					alignItems: "center",
					backgroundColor: avatar === "you" ? colors.sand : colors.puppyDisc,
					borderRadius: select.toggleAvatar / 2,
					height: select.toggleAvatar,
					justifyContent: "center",
					overflow: "hidden",
					width: select.toggleAvatar,
				}}
			>
				{avatar === "you" ? (
					<Icon name="user" size={select.toggleIcon} />
				) : (
					<View
						style={{
							transform: [{ translateY: select.toggleAvatar * PUPPY_NUDGE }],
						}}
					>
						<Character kind="puppy" size={select.toggleAvatar * PUPPY_WIDTH} />
					</View>
				)}
			</View>
			<View style={{ flex: 1, gap: select.toggleTextGap }}>
				<ClayText variant="toggleTitle">{title}</ClayText>
				<ClayText style={{ opacity: 0.75 }} variant="toggleSubtitle">
					{subtitle}
				</ClayText>
			</View>
			<Animated.View
				style={{
					alignItems: "center",
					backgroundColor: on ? colors.inkNavy : colors.toggleOff,
					borderRadius: select.toggleDisc / 2,
					height: select.toggleDisc,
					justifyContent: "center",
					transitionDuration: ms(select.toggleColor),
					transitionProperty: "backgroundColor",
					transitionTimingFunction: "ease-in-out",
					width: select.toggleDisc,
				}}
			>
				<Animated.View
					style={{
						opacity: on ? 1 : 0,
						transform: [{ scale: on || calm ? 1 : 0.3 }],
						transitionDuration: [ms(select.toggleFade), ms(select.togglePop)],
						transitionProperty: ["opacity", "transform"],
						transitionTimingFunction: [easeOut, overshoot],
					}}
				>
					<Icon color={colors.sun} name="check" size={select.toggleCheck} />
				</Animated.View>
			</Animated.View>
		</ClayPressable>
	);
}
