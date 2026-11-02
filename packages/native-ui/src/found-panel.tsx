import { type StyleProp, Text, View, type ViewStyle } from "react-native";
import { colors, flat, fonts } from "./tokens";

const panel = flat.found;
const itemLine = panel.itemSize * panel.itemLine;

/** 16: "Tonight we found out" and the things learned, on flat sand. */
export function FoundPanel({
	items,
	style,
	title = "Tonight we found out",
}: {
	items: string[];
	style?: StyleProp<ViewStyle>;
	title?: string;
}) {
	return (
		<View
			style={[
				{
					alignSelf: "stretch",
					backgroundColor: colors.sand,
					borderRadius: panel.radius,
					paddingBottom: panel.padBottom,
					paddingHorizontal: panel.padX,
					paddingTop: panel.padTop,
				},
				style,
			]}
		>
			<Text
				allowFontScaling={false}
				style={{
					color: colors.inkNavy,
					fontFamily: fonts.heavy,
					fontSize: panel.titleSize,
					marginBottom: panel.titleGap,
				}}
			>
				{title}
			</Text>
			{items.map((item) => (
				<View key={item} style={{ paddingVertical: panel.itemPadY }}>
					<View
						style={{
							backgroundColor: colors.sun,
							borderRadius: panel.dot / 2,
							height: panel.dot,
							left: panel.dotLeft,
							position: "absolute",
							top: panel.itemPadY + (itemLine - panel.dot) / 2,
							width: panel.dot,
						}}
					/>
					<Text
						allowFontScaling={false}
						style={{
							color: colors.inkNavy,
							fontFamily: fonts.label,
							fontSize: panel.itemSize,
							lineHeight: itemLine,
							paddingLeft: panel.indent,
						}}
					>
						{item}
					</Text>
				</View>
			))}
		</View>
	);
}
