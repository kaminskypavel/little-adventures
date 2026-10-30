import { Text, type TextProps } from "react-native";
import { colors, type } from "./tokens";

type ClayTextProps = TextProps & {
	align?: "center" | "left" | "right";
	color?: string;
	/** Tabular numerals, for ages and "2 of 6". */
	tabular?: boolean;
	variant: keyof typeof type;
};

export function ClayText({
	align,
	color = colors.inkNavy,
	style,
	tabular,
	variant,
	...rest
}: ClayTextProps) {
	return (
		<Text
			style={[
				type[variant],
				{ color, textAlign: align },
				tabular ? { fontVariant: ["tabular-nums"] } : null,
				style,
			]}
			{...rest}
		/>
	);
}
