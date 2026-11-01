import { Image } from "expo-image";
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
// The photo button: a thin clay rim around the photo, and a small badge in the corner.
const PHOTO_RIM = 3;
const BADGE = 28;
const BADGE_ICON = 16;
const BADGE_SHIFT = -2;
const easeOut = cubicBezier(...motion.easeOut);
const overshoot = cubicBezier(...motion.overshoot);

/** The photo button over the avatar slot: the photo, or an empty circle to add one. */
interface ToggleCardPhoto {
	label: string;
	onPress: () => void;
	uri: string | null;
}

function PhotoButton({ label, onPress, uri }: ToggleCardPhoto) {
	return (
		<ClayPressable
			accessibilityLabel={label}
			onPress={onPress}
			radius={select.toggleAvatar / 2}
			style={{
				alignItems: "center",
				height: select.toggleAvatar,
				justifyContent: "center",
				left: select.togglePadLeft,
				position: "absolute",
				top: (select.toggleHeight - select.toggleAvatar) / 2,
				width: select.toggleAvatar,
			}}
			tone="field"
		>
			{uri ? (
				<View
					style={{
						borderRadius: select.toggleAvatar / 2 - PHOTO_RIM,
						height: select.toggleAvatar - PHOTO_RIM * 2,
						overflow: "hidden",
						width: select.toggleAvatar - PHOTO_RIM * 2,
					}}
				>
					<Image
						accessibilityIgnoresInvertColors
						contentFit="cover"
						source={{ uri }}
						style={{ height: "100%", width: "100%" }}
					/>
				</View>
			) : (
				<Icon name="camera" size={select.toggleIcon} />
			)}
			<View
				pointerEvents="none"
				style={{
					alignItems: "center",
					backgroundColor: colors.inkNavy,
					borderRadius: BADGE / 2,
					bottom: BADGE_SHIFT,
					height: BADGE,
					justifyContent: "center",
					position: "absolute",
					right: BADGE_SHIFT,
					width: BADGE,
				}}
			>
				<Icon
					color={colors.cream}
					name={uri ? "camera" : "plus"}
					size={BADGE_ICON}
				/>
			</View>
		</ClayPressable>
	);
}

/**
 * You / Puppy: avatar, two text lines, and an on / off disc at the right edge.
 * With a photo button the avatar slot is its own tap target, a sibling of the card
 * (never nested in it), so tapping the photo never ticks the card.
 */
export function ToggleCard({
	avatar,
	on,
	onPress,
	photo,
	style,
	subtitle,
	title,
}: {
	avatar: "puppy" | "you";
	on: boolean;
	onPress?: () => void;
	photo?: ToggleCardPhoto;
	style?: StyleProp<ViewStyle>;
	subtitle: string;
	title: string;
}) {
	const calm = useCalm();
	const ms = (n: number) => (calm ? 0 : n);

	return (
		<View style={style}>
			<ClayPressable
				accessibilityLabel={`${title}, ${subtitle}`}
				accessibilityRole="switch"
				accessibilityState={{ checked: on }}
				onPress={onPress}
				radius={radii.card}
				selected={on}
				style={{
					alignItems: "center",
					flexDirection: "row",
					gap: select.toggleGap,
					height: select.toggleHeight,
					paddingLeft: select.togglePadLeft,
					paddingRight: select.togglePadRight,
				}}
				tone="sage"
			>
				<View
					style={{
						alignItems: "center",
						backgroundColor: avatarFill(avatar, Boolean(photo)),
						borderRadius: select.toggleAvatar / 2,
						height: select.toggleAvatar,
						justifyContent: "center",
						overflow: "hidden",
						width: select.toggleAvatar,
					}}
				>
					{photo ? null : <AvatarArt avatar={avatar} />}
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
			{photo ? <PhotoButton {...photo} /> : null}
		</View>
	);
}

// An empty slot (the photo button sits over it) stays clear so no rim peeks out.
function avatarFill(avatar: "puppy" | "you", hasPhoto: boolean) {
	if (hasPhoto) {
		return "transparent";
	}
	return avatar === "you" ? colors.sand : colors.puppyDisc;
}

function AvatarArt({ avatar }: { avatar: "puppy" | "you" }) {
	if (avatar === "you") {
		return <Icon name="user" size={select.toggleIcon} />;
	}
	return (
		<View
			style={{ transform: [{ translateY: select.toggleAvatar * PUPPY_NUDGE }] }}
		>
			<Character kind="puppy" size={select.toggleAvatar * PUPPY_WIDTH} />
		</View>
	);
}
