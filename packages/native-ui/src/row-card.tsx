import { type StyleProp, View, type ViewStyle } from "react-native";
import { ClayPressable } from "./clay-pressable";
import { ClayText } from "./clay-text";
import { CardPicture } from "./list-row";
import { fonts, listCards } from "./tokens";

const { list, row } = listCards;

/** Finished row on Home and the Adventures list in Grown-ups: round picture, title, optional subtitle and count. */
export function RowCard({
	count,
	onPress,
	picture,
	style,
	subtitle,
	title,
}: {
	count?: string;
	onPress?: () => void;
	picture: number | null;
	style?: StyleProp<ViewStyle>;
	subtitle?: string;
	title: string;
}) {
	const label = [title, subtitle, count].filter(Boolean).join(", ");
	return (
		<ClayPressable
			accessibilityLabel={label}
			onPress={onPress}
			radius={list.radius}
			style={[
				{
					alignItems: "center",
					alignSelf: "stretch",
					flexDirection: "row",
					gap: list.gap,
					height: list.height,
					paddingLeft: row.padLeft,
					paddingRight: list.padRight,
				},
				style,
			]}
			tone="sage"
		>
			<CardPicture
				height={row.picture}
				picture={picture}
				radius={row.picture / 2}
				width={row.picture}
			/>
			<View style={{ flex: 1, minWidth: 0 }}>
				<ClayText
					numberOfLines={1}
					style={{ fontSize: list.titleFont, lineHeight: list.titleLine }}
					variant="title"
				>
					{title}
				</ClayText>
				{subtitle ? (
					<ClayText
						numberOfLines={1}
						style={{
							fontFamily: fonts.body,
							fontSize: row.subtitleFont,
							lineHeight: list.captionLine,
							opacity: list.captionOpacity,
						}}
						tabular
						variant="body"
					>
						{subtitle}
					</ClayText>
				) : null}
			</View>
			{count ? (
				<View
					style={{
						backgroundColor: row.countPill,
						borderRadius: row.countRadius,
						paddingBottom: row.countPadBottom,
						paddingHorizontal: row.countPadX,
						paddingTop: row.countPadTop,
					}}
				>
					<ClayText
						style={{ fontSize: row.countFont, lineHeight: row.countLine }}
						tabular
						variant="title"
					>
						{count}
					</ClayText>
				</View>
			) : null}
		</ClayPressable>
	);
}
