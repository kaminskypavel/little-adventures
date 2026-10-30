import {
	NotificationFeedbackType,
	notificationAsync,
	selectionAsync,
} from "expo-haptics";
import { useCallback, useRef } from "react";
import { type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";
import {
	GestureDetector,
	useLongPressGesture,
} from "react-native-gesture-handler";
import Animated, {
	Easing,
	Extrapolation,
	interpolate,
	ReduceMotion,
	useAnimatedProps,
	useAnimatedStyle,
	useSharedValue,
	withSpring,
	withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { scheduleOnRN } from "react-native-worklets";
import { ClaySurface } from "./clay-surface";
import { Icon } from "./icons";
import { useCalm } from "./motion-provider";
import { colors, flat, motion } from "./tokens";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const gate = flat.holdGate;
const center = gate.box / 2;
const ringRadius = (gate.box - gate.stroke) / 2;
const circumference = 2 * Math.PI * ringRadius;
const easeOut = Easing.bezier(...motion.easeOut);
// The ring is information, not decoration: it fills even under reduced motion.
const ringTiming = { reduceMotion: ReduceMotion.Never } as const;
// A damping ratio of 0.5 swings back past rest by about this much of the press travel.
const SPRING_UNDERSHOOT = 0.16;

/**
 * 17: hold the lock for 3 s. The ring fills linearly while held, release early
 * and it resets in 200 ms. `onOpen` runs once the ring is full. Screen readers
 * cannot hold, so the `activate` action opens it directly.
 */
export function HoldGate({
	accessibilityLabel = "Hold to open grown-ups",
	onOpen,
	style,
}: {
	accessibilityLabel?: string;
	onOpen: () => void;
	style?: StyleProp<ViewStyle>;
}) {
	const calm = useCalm();
	const ring = useSharedValue(0);
	const pressed = useSharedValue(0);

	const onOpenRef = useRef(onOpen);
	onOpenRef.current = onOpen;
	const open = useCallback(() => onOpenRef.current(), []);
	const openWithTick = useCallback(() => {
		notificationAsync(NotificationFeedbackType.Success);
		onOpenRef.current();
	}, []);

	const hold = useLongPressGesture({
		// The finger may wander while holding.
		maxDistance: gate.box,
		minDuration: motion.holdGate,
		onActivate: () => {
			ring.set(1);
			scheduleOnRN(openWithTick);
		},
		onBegin: () => {
			pressed.set(
				withTiming(1, {
					duration: calm ? motion.reducedPress : motion.press,
					easing: easeOut,
				})
			);
			ring.set(
				withTiming(1, {
					duration: motion.holdGate,
					easing: Easing.linear,
					...ringTiming,
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
			ring.set(
				withTiming(0, {
					duration: motion.holdReset,
					easing: Easing.linear,
					...ringTiming,
				})
			);
		},
	});

	const ringProps = useAnimatedProps(() => ({
		strokeDashoffset: circumference * (1 - ring.get()),
	}));

	const move = useAnimatedStyle(() => {
		// Reduced motion: no translate, no scale; the lip still compresses.
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
		<GestureDetector gesture={hold}>
			<View
				accessibilityActions={[{ name: "activate" }]}
				accessibilityLabel={accessibilityLabel}
				accessibilityRole="button"
				accessible
				onAccessibilityAction={(event) => {
					if (event.nativeEvent.actionName === "activate") {
						open();
					}
				}}
				style={[
					{
						alignItems: "center",
						alignSelf: "center",
						height: gate.box,
						justifyContent: "center",
						width: gate.box,
					},
					style,
				]}
			>
				<View
					pointerEvents="none"
					style={[
						StyleSheet.absoluteFill,
						{ transform: [{ rotate: "-90deg" }] },
					]}
				>
					<Svg height={gate.box} width={gate.box}>
						<Circle
							cx={center}
							cy={center}
							fill="none"
							r={ringRadius}
							stroke={gate.track}
							strokeWidth={gate.stroke}
						/>
						<AnimatedCircle
							animatedProps={ringProps}
							cx={center}
							cy={center}
							fill="none"
							r={ringRadius}
							stroke={colors.sun}
							strokeDasharray={circumference}
							strokeLinecap="round"
							strokeWidth={gate.stroke}
						/>
					</Svg>
				</View>
				<Animated.View
					pointerEvents="none"
					style={[{ height: gate.core, width: gate.core }, move]}
				>
					<ClaySurface
						pressed={pressed}
						radius={gate.core / 2}
						style={[
							StyleSheet.absoluteFill,
							{ alignItems: "center", justifyContent: "center" },
						]}
						tone="sun"
					>
						<Icon color={colors.inkNavy} name="lock" size={gate.coreIcon} />
					</ClaySurface>
				</Animated.View>
			</View>
		</GestureDetector>
	);
}
