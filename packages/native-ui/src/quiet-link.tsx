import { Pressable } from "react-native";
import { ClayText } from "./clay-text";
import { colors } from "./tokens";

const QUIET = { opacity: 0.7 } as const;
const LINK_HEIGHT = 44;

/** Small cream text that taps: no button chrome, a 44 pt tap area. */
export function QuietLink({
	label,
	onPress,
}: {
	label: string;
	onPress: () => void;
}) {
	return (
		<Pressable
			accessibilityLabel={label}
			accessibilityRole="link"
			onPress={onPress}
			style={{
				alignItems: "center",
				justifyContent: "center",
				minHeight: LINK_HEIGHT,
			}}
		>
			<ClayText
				align="center"
				color={colors.cream}
				style={QUIET}
				variant="label"
			>
				{label}
			</ClayText>
		</Pressable>
	);
}
