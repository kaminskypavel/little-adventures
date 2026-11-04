import { useState } from "react";
import {
	Pressable,
	type StyleProp,
	Text,
	View,
	type ViewStyle,
} from "react-native";
import { ClayText } from "./clay-text";
import { colors, flat, fonts } from "./tokens";

const { plan } = flat;
const ROW_LINE = 24;

/**
 * Grown-ups "Your plan": a flat sand panel (information, not a button) with a small tag at the top
 * right, a few dotted rows and a quiet note. `rtl` mirrors it for Hebrew: tag at the top left,
 * text right-aligned, the dots on the right. It starts collapsed to its title; a tap opens it.
 */
export function PlanCard({
	items,
	note,
	rtl = false,
	style,
	tag,
	title,
}: {
	items: string[];
	note: string;
	rtl?: boolean;
	style?: StyleProp<ViewStyle>;
	tag: string;
	title: string;
}) {
	const align = rtl ? "right" : undefined;
	const [open, setOpen] = useState(false);
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityState={{ expanded: open }}
			onPress={() => setOpen(!open)}
			style={[
				{
					alignSelf: "stretch",
					backgroundColor: colors.sand,
					borderRadius: plan.radius,
					paddingBottom: plan.padBottom,
					paddingHorizontal: plan.padX,
					paddingTop: plan.padTop,
				},
				style,
			]}
		>
			<View
				style={{
					backgroundColor: colors.inkNavy,
					borderRadius: plan.tag.radius,
					paddingHorizontal: plan.tag.padX,
					paddingVertical: plan.tag.padY,
					position: "absolute",
					[rtl ? "left" : "right"]: plan.tag.inset,
					top: plan.tag.inset,
				}}
			>
				<Text
					allowFontScaling={false}
					style={{
						color: colors.sand,
						fontFamily: fonts.heavy,
						fontSize: plan.tag.size,
						lineHeight: plan.tag.size * 1.2,
					}}
				>
					{tag}
				</Text>
			</View>
			<ClayText
				accessibilityRole="header"
				align={align}
				style={{ fontSize: 24, lineHeight: 28 }}
				variant="title"
			>
				{title}
			</ClayText>
			{open
				? items.map((item) => (
						<View
							key={item}
							style={{
								alignItems: "center",
								flexDirection: rtl ? "row-reverse" : "row",
								gap: plan.rowGap,
								marginTop: plan.rowGap,
							}}
						>
							<View
								style={{
									backgroundColor: colors.sun,
									borderRadius: plan.dot / 2,
									height: plan.dot,
									width: plan.dot,
								}}
							/>
							<ClayText
								align={align}
								style={{ flex: 1, lineHeight: ROW_LINE }}
								variant="label"
							>
								{item}
							</ClayText>
						</View>
					))
				: null}
			{open ? (
				<ClayText
					align={align}
					style={{
						fontSize: 17,
						lineHeight: 22,
						marginTop: plan.noteGap,
						opacity: 0.7,
					}}
					variant="body"
				>
					{note}
				</ClayText>
			) : null}
		</Pressable>
	);
}
