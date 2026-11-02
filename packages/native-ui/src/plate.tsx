import { type StyleProp, Text, View, type ViewStyle } from "react-native";
import { Icon } from "./icons";
import { colors, flat, fonts } from "./tokens";

type PlateVariant = "big" | "hero" | "place" | "question";
/** Sand is the plate; sun marks where you are; dim is a place not yet reachable. */
type PlateTone = "dim" | "sand" | "sun";

const DIM = { fill: "#D9CEAE", ink: "#37504A" } as const;

const { big, icon: iconSize, iconGap, place, question } = flat.plate;

/** A flat sand label. Never clay, never lifted, never tappable. */
export function Plate({
	icon,
	label,
	style,
	tone = "sand",
	variant = "place",
}: {
	icon?: "check" | "lock";
	label: string;
	style?: StyleProp<ViewStyle>;
	tone?: PlateTone;
	variant?: PlateVariant;
}) {
	if (variant === "question") {
		return (
			<View
				style={[
					{
						alignSelf: "center",
						backgroundColor: colors.sand,
						borderRadius: question.radius,
						maxWidth: question.maxWidth,
						paddingBottom: question.padBottom,
						paddingHorizontal: question.padX,
						paddingTop: question.padTop,
					},
					style,
				]}
			>
				<Text
					allowFontScaling={false}
					style={{
						color: colors.inkNavy,
						fontFamily: fonts.label,
						fontSize: question.size,
						lineHeight: question.size * question.lineHeight,
						textAlign: "center",
					}}
				>
					{label}
				</Text>
			</View>
		);
	}

	const size = variant === "place" ? place : big;
	const dim = tone === "dim";
	let fill: string = colors.sand;
	if (variant === "hero" || tone === "sun") {
		fill = colors.sun;
	} else if (dim) {
		({ fill } = DIM);
	}
	const ink = dim ? DIM.ink : colors.inkNavy;
	return (
		<View
			style={[
				{
					alignItems: "center",
					alignSelf: "flex-start",
					backgroundColor: fill,
					borderRadius: size.radius,
					flexDirection: "row",
					gap: iconGap,
					height: size.height,
					paddingHorizontal: size.padX,
				},
				style,
			]}
		>
			{icon ? <Icon color={ink} name={icon} size={iconSize} /> : null}
			<Text
				allowFontScaling={false}
				numberOfLines={1}
				style={{
					color: ink,
					fontFamily: fonts.heavy,
					fontSize: size.size,
				}}
			>
				{label}
			</Text>
		</View>
	);
}
