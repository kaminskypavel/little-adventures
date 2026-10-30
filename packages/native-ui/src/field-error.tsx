import { StyleSheet } from "react-native";
import { ClayText } from "./clay-text";
import { colors, type } from "./tokens";

const GAP = 3;
const SIZE = 16;
const LINE = 18;

/**
 * The calm line that says what to fix, drawn inside the gap under its field or group
 * (absolutely positioned), so showing it never moves anything below. Announced to screen
 * readers. The parent must not clip its overflow.
 */
export function FieldError({ message }: { message?: string }) {
	if (!message) {
		return null;
	}
	return (
		<ClayText
			accessibilityLiveRegion="polite"
			color={colors.cream}
			numberOfLines={1}
			role="alert"
			style={styles.line}
			variant="fieldError"
		>
			{message}
		</ClayText>
	);
}

const styles = StyleSheet.create({
	line: {
		...type.fieldError,
		fontSize: SIZE,
		left: 0,
		lineHeight: LINE,
		marginTop: GAP,
		position: "absolute",
		right: 0,
		top: "100%",
	},
});
