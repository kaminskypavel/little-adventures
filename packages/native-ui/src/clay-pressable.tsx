import { selectionAsync } from "expo-haptics";
import {
	type ReactNode,
	useCallback,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import {
	type AccessibilityRole,
	type AccessibilityState,
	type Insets,
	type LayoutChangeEvent,
	type StyleProp,
	StyleSheet,
	type ViewStyle,
} from "react-native";
import { GestureDetector, useTapGesture } from "react-native-gesture-handler";
import Animated, {
	Easing,
	Extrapolation,
	interpolate,
	useAnimatedStyle,
	useSharedValue,
	withSpring,
	withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { type ClayRadius, ClaySurface, cornerStyle } from "./clay-surface";
import { useCalm } from "./motion-provider";
import {
	type ClayTone,
	colors,
	focusRing,
	layout,
	motion,
	radii,
} from "./tokens";
import { useFocusRing } from "./use-focus-ring";

interface ClayPressableProps {
	accessibilityLabel: string;
	accessibilityRole?: AccessibilityRole;
	accessibilityState?: AccessibilityState;
	children?: ReactNode;
	disabled?: boolean;
	/** Overrides the automatic slop that grows the target to 64 pt. */
	hitSlop?: number | Insets;
	onPress?: () => void;
	radius?: ClayRadius;
	selected?: boolean;
	style?: StyleProp<ViewStyle>;
	testID?: string;
	tone?: ClayTone;
}

const easeOut = Easing.bezier(...motion.easeOut);
// A damping ratio of 0.5 swings back past rest by about this much of the press travel.
const SPRING_UNDERSHOOT = 0.16;

/**
 * The only press implementation. Down: lip compresses, 4 pt drop, scale 0.97, a selection tick.
 * Up: springs back with a small overshoot, and onPress runs on release, not on press.
 */
export function ClayPressable({
	accessibilityLabel,
	accessibilityRole = "button",
	accessibilityState,
	children,
	disabled = false,
	hitSlop,
	onPress,
	radius = radii.button,
	selected,
	style,
	testID,
	tone = "sage",
}: ClayPressableProps) {
	const calm = useCalm();
	const pressed = useSharedValue(0);
	// The extra touch area that grows a small button to the minimum target. Kept, not the size, so
	// a button that resizes every frame (the morphing pill) does not re-render on every frame.
	const [grow, setGrow] = useState({
		horizontal: layout.minTarget / 2,
		vertical: layout.minTarget / 2,
	});

	const onPressRef = useRef(onPress);
	useLayoutEffect(() => {
		onPressRef.current = onPress;
	}, [onPress]);
	const fire = useCallback(() => onPressRef.current?.(), []);

	const { focused, props: focusProps } = useFocusRing(!disabled);

	const onLayout = useCallback((event: LayoutChangeEvent) => {
		const { height, width } = event.nativeEvent.layout;
		const horizontal = Math.max(0, (layout.minTarget - width) / 2);
		const vertical = Math.max(0, (layout.minTarget - height) / 2);
		setGrow((prev) =>
			prev.horizontal === horizontal && prev.vertical === vertical
				? prev
				: { horizontal, vertical }
		);
	}, []);

	const slop = hitSlop ?? grow;

	const tap = useTapGesture({
		enabled: !disabled,
		hitSlop: slop,
		onActivate: () => {
			scheduleOnRN(fire);
		},
		onBegin: () => {
			pressed.set(
				withTiming(1, {
					duration: calm ? motion.reducedPress : motion.press,
					easing: easeOut,
				})
			);
			scheduleOnRN(selectionAsync);
		},
		onFinalize: () => {
			pressed.set(
				calm
					? withTiming(0, { duration: motion.reducedPress, easing: easeOut })
					: withSpring(0, { dampingRatio: 0.5, duration: motion.release })
			);
		},
	});

	const move = useAnimatedStyle(() => {
		// Reduced motion: no translate, no scale, no overshoot; the lip still compresses.
		const p = calm ? 0 : pressed.get();
		return {
			transform: [
				{ translateY: p * motion.pressTranslate },
				{
					scale: interpolate(
						p,
						[-SPRING_UNDERSHOOT, 0, 1],
						[motion.releaseOvershoot, 1, motion.pressScale],
						Extrapolation.CLAMP
					),
				},
			],
		};
	});

	return (
		<GestureDetector gesture={tap}>
			<Animated.View
				{...focusProps}
				accessibilityLabel={accessibilityLabel}
				accessibilityRole={accessibilityRole}
				accessible
				aria-busy={accessibilityState?.busy}
				aria-checked={accessibilityState?.checked}
				aria-disabled={disabled || accessibilityState?.disabled}
				aria-expanded={accessibilityState?.expanded}
				aria-selected={selected ?? accessibilityState?.selected}
				onAccessibilityTap={fire}
				onLayout={onLayout}
				style={[
					{ ...cornerStyle(radius), cursor: "pointer" },
					focused
						? {
								outlineColor: colors.sun,
								outlineOffset: focusRing.offset,
								outlineStyle: "solid",
								outlineWidth: focusRing.width,
							}
						: null,
					style,
					move,
				]}
				testID={testID}
			>
				<ClaySurface
					pressed={pressed}
					radius={radius}
					selected={selected}
					style={StyleSheet.absoluteFill}
					tone={tone}
				/>
				{children}
			</Animated.View>
		</GestureDetector>
	);
}
