import { useState } from "react";
import {
	type StyleProp,
	StyleSheet,
	TextInput,
	type TextInputProps,
	type TextStyle,
	View,
	type ViewStyle,
} from "react-native";
import Animated, { cubicBezier } from "react-native-reanimated";
import { ClayText } from "./clay-text";
import { useCalm } from "./motion-provider";
import { colors, motion, radii, select, shadows, type } from "./tokens";

type TextFieldProps = Omit<TextInputProps, "style"> & {
	error?: string;
	/** Extra style for the input text itself (for example letter spacing on a code field). */
	inputStyle?: StyleProp<TextStyle>;
	label: string;
	/** Long values (an email address) use 800 24 so they fit; short ones keep 900 39. */
	long?: boolean;
	style?: StyleProp<ViewStyle>;
};

const ease = cubicBezier(...motion.easeOut);

/**
 * A real, recessed text input. Not clay: no lift, no squash, no haptic.
 * Focus slides the border to sun and fades in a 4 pt ring.
 */
export function TextField({
	error,
	inputStyle,
	label,
	long = false,
	onBlur,
	onFocus,
	style,
	...input
}: TextFieldProps) {
	const calm = useCalm();
	const [focused, setFocused] = useState(false);
	const duration = calm ? 0 : select.focus;
	const fade = {
		transitionDuration: duration,
		transitionTimingFunction: ease,
	} as const;

	return (
		<View style={style}>
			<ClayText color={colors.cream} variant="label">
				{label}
			</ClayText>
			<View style={{ marginTop: select.fieldLabelGap }}>
				<Animated.View
					pointerEvents="none"
					style={[
						StyleSheet.absoluteFill,
						{
							borderRadius: radii.field,
							boxShadow: shadows.fieldRing,
							opacity: focused ? 1 : 0,
							transitionProperty: "opacity",
							...fade,
						},
					]}
				/>
				<Animated.View
					style={{
						backgroundColor: colors.fieldFill,
						borderColor: focused ? colors.sun : colors.fieldBorder,
						borderRadius: radii.field,
						borderWidth: select.fieldBorder,
						boxShadow: shadows.fieldWell,
						height: select.fieldHeight,
						transitionProperty: "borderColor",
						...fade,
					}}
				>
					<TextInput
						accessibilityLabel={label}
						cursorColor={colors.caret}
						placeholderTextColor={colors.fieldPlaceholder}
						selectionColor={colors.caret}
						{...input}
						onBlur={(event) => {
							setFocused(false);
							onBlur?.(event);
						}}
						onFocus={(event) => {
							setFocused(true);
							onFocus?.(event);
						}}
						style={[
							long ? type.fieldLong : type.headline,
							styles.input,
							webCaret,
							inputStyle,
						]}
					/>
				</Animated.View>
			</View>
			{error ? (
				<ClayText
					accessibilityLiveRegion="polite"
					color={colors.cream}
					style={{ marginTop: select.fieldLabelGap }}
					variant="fieldError"
				>
					{error}
				</ClayText>
			) : null}
		</View>
	);
}

// Colour on native too; the caret and "no outline" parts only matter on web, and RN's TextStyle
// types do not list them.
const webCaret = {
	caretColor: colors.caret,
	color: colors.inkNavy,
	outlineStyle: "none",
} as unknown as TextStyle;

const styles = StyleSheet.create({
	input: {
		flex: 1,
		paddingHorizontal: select.fieldPadX,
		paddingVertical: 0,
	},
});
