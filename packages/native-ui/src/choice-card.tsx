import { NotificationFeedbackType, notificationAsync } from "expo-haptics";
import type { ImageSource } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
	type LayoutChangeEvent,
	type StyleProp,
	StyleSheet,
	View,
	type ViewStyle,
} from "react-native";
import Animated, {
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withSequence,
	withTiming,
} from "react-native-reanimated";
import { ClayPressable } from "./clay-pressable";
import { ClayText } from "./clay-text";
import { FallbackImage } from "./fallback-image";
import { Icon } from "./icons";
import { useCalm } from "./motion-provider";
import { Placeholder } from "./placeholder";
import { colors, listCards, motion } from "./tokens";

const { choice } = listCards;
const easeOut = Easing.bezier(...motion.easeOut);
const overshoot = Easing.bezier(...motion.overshoot);

const pulse = {
	"0%": { transform: [{ scale: 1 }] },
	"50%": { transform: [{ scale: motion.pulsePeak }] },
	"100%": { transform: [{ scale: 1 }] },
};

type ChoiceState = "drawing" | "locked" | "open";

const TONES = { drawing: "drawing", locked: "locked", open: "sage" } as const;

/** The picture layer: place art fills it, an end goal sits shifted left on its backdrop. */
function Art({
	blur,
	kind,
	locked,
	picture,
}: {
	blur: number;
	kind: "goal" | "place";
	locked: boolean;
	picture: ImageSource | number | null;
}) {
	const placeholder = (
		<Placeholder icon="image" style={StyleSheet.absoluteFill} />
	);
	if (kind === "goal") {
		return (
			<View
				style={[
					StyleSheet.absoluteFill,
					{
						alignItems: "center",
						backgroundColor: colors.goalBackdrop,
						justifyContent: "center",
						paddingRight: choice.goalPadRight,
					},
				]}
			>
				<FallbackImage
					blurRadius={blur}
					contentFit="contain"
					kind={locked ? "goalClosed" : "goalOpen"}
					placeholder={placeholder}
					source={picture}
					style={{ height: choice.goalHeight, width: "100%" }}
				/>
			</View>
		);
	}
	return (
		<FallbackImage
			blurRadius={blur}
			contentFit="cover"
			kind="place"
			placeholder={placeholder}
			source={picture}
			style={StyleSheet.absoluteFill}
		/>
	);
}

/** A diagonal highlight band sweeping left to right across the picture, forever. */
function Shimmer() {
	const [width, setWidth] = useState(0);
	const onLayout = useCallback((event: LayoutChangeEvent) => {
		setWidth(event.nativeEvent.layout.width);
	}, []);
	// The band is as wide as the picture. It starts fully off the left edge and ends off the right.
	const sweep = useMemo(
		() => ({
			from: { transform: [{ translateX: -1.05 * width }] },
			to: { transform: [{ translateX: 2.55 * width }] },
		}),
		[width]
	);

	return (
		<View
			onLayout={onLayout}
			pointerEvents="none"
			style={[StyleSheet.absoluteFill, { overflow: "hidden" }]}
		>
			{width > 0 ? (
				<Animated.View
					style={{
						animationDuration: `${motion.shimmer}ms`,
						animationIterationCount: "infinite",
						animationName: sweep,
						animationTimingFunction: "linear",
						bottom: "-30%",
						position: "absolute",
						top: "-30%",
						width,
					}}
				>
					<View
						style={{ flex: 1, transform: [{ rotate: choice.shimmerTilt }] }}
					>
						<LinearGradient
							colors={[
								choice.shimmerClear,
								choice.shimmer,
								choice.shimmerClear,
							]}
							end={{ x: 1, y: 0.5 }}
							start={{ x: 0, y: 0.5 }}
							style={StyleSheet.absoluteFill}
						/>
					</View>
				</Animated.View>
			) : null}
		</View>
	);
}

/**
 * Wide picture card for choosing a place or the end goal. States: open, locked ("not yet"
 * shake plus a warning tick), drawing (art still being made: blurred, desaturated, shimmering).
 * Blur uses the image's own blur radius. iOS filters only do brightness and opacity, so
 * desaturation is a gray veil over the picture and brightness is a black veil.
 */
export function ChoiceCard({
	kind = "place",
	name,
	onPress,
	picture,
	pulseDelay = null,
	selected = false,
	state = "open",
	style,
	testID,
}: {
	kind?: "goal" | "place";
	name: string;
	onPress?: () => void;
	picture: ImageSource | number | null;
	/** Pulse once after mounting, this many ms from now. Omit for no pulse. */
	pulseDelay?: number | null;
	selected?: boolean;
	state?: ChoiceState;
	style?: StyleProp<ViewStyle>;
	testID?: string;
}) {
	const calm = useCalm();
	const locked = state === "locked";
	const drawing = state === "drawing";

	const shake = useSharedValue(0);
	const shakeStyle = useAnimatedStyle(() => ({
		transform: [{ translateX: shake.get() }],
	}));

	const ring = useSharedValue(selected ? 1 : 0);
	const ringOpacity = useSharedValue(selected ? 1 : 0);
	useEffect(() => {
		ring.set(
			withTiming(selected ? 1 : 0, {
				duration: calm ? 0 : choice.selectPop,
				easing: overshoot,
			})
		);
		ringOpacity.set(
			withTiming(selected ? 1 : 0, {
				duration: calm ? 0 : choice.selectFade,
				easing: easeOut,
			})
		);
	}, [calm, ring, ringOpacity, selected]);
	const ringStyle = useAnimatedStyle(() => ({
		opacity: ringOpacity.get(),
		transform: [
			{
				scale: choice.ringRestScale + (1 - choice.ringRestScale) * ring.get(),
			},
		],
	}));

	const handlePress = () => {
		if (!locked) {
			onPress?.();
			return;
		}
		notificationAsync(NotificationFeedbackType.Warning);
		if (!calm) {
			shake.set(
				withSequence(
					...choice.shakeSegments.map((segment) =>
						withTiming(segment.x, { duration: segment.ms, easing: easeOut })
					)
				)
			);
		}
	};

	const pulses = typeof pulseDelay === "number" && !calm;

	return (
		<Animated.View
			style={[
				{ alignSelf: "stretch", height: choice.height },
				style,
				shakeStyle,
			]}
		>
			<Animated.View
				style={[
					{ flex: 1 },
					pulses
						? {
								animationDelay: `${pulseDelay}ms`,
								animationDuration: `${motion.pulse}ms`,
								animationIterationCount: 1,
								animationName: pulse,
								animationTimingFunction: "ease-in-out",
							}
						: null,
				]}
			>
				<Animated.View
					pointerEvents="none"
					style={[
						{
							borderColor: colors.sun,
							borderRadius: choice.ringRadius,
							borderWidth: choice.ringWidth,
							bottom: -choice.ringOffset,
							left: -choice.ringOffset,
							position: "absolute",
							right: -choice.ringOffset,
							top: -choice.ringOffset,
						},
						ringStyle,
					]}
				/>
				<ClayPressable
					accessibilityLabel={locked ? `${name}, locked` : name}
					accessibilityState={{ selected }}
					onPress={handlePress}
					radius={choice.radius}
					style={{ flex: 1 }}
					testID={testID}
					tone={TONES[state]}
				>
					<View
						style={{
							borderRadius: choice.radius - choice.pad,
							bottom: choice.pad,
							left: choice.pad,
							overflow: "hidden",
							position: "absolute",
							right: choice.pad,
							top: choice.pad,
						}}
					>
						<Art
							blur={drawing ? choice.drawingBlur : 0}
							kind={kind}
							locked={locked}
							picture={picture}
						/>
						{drawing ? (
							<>
								<View
									pointerEvents="none"
									style={[
										StyleSheet.absoluteFill,
										{ backgroundColor: choice.drawingGrayVeil },
									]}
								/>
								<View
									pointerEvents="none"
									style={[
										StyleSheet.absoluteFill,
										{ backgroundColor: choice.drawingBrightnessVeil },
									]}
								/>
							</>
						) : null}
						{locked ? (
							<>
								<View
									pointerEvents="none"
									style={[
										StyleSheet.absoluteFill,
										{ backgroundColor: choice.lockedGrayVeil },
									]}
								/>
								<View
									pointerEvents="none"
									style={[
										StyleSheet.absoluteFill,
										{ backgroundColor: choice.dim },
									]}
								/>
							</>
						) : null}
					</View>
					<View
						pointerEvents="none"
						style={{
							alignItems: "center",
							bottom: choice.chipBottom,
							left: 0,
							position: "absolute",
							right: 0,
						}}
					>
						<View
							style={{
								alignItems: "center",
								backgroundColor: colors.sand,
								borderRadius: choice.chipRadius,
								flexDirection: "row",
								gap: choice.chipGap,
								maxWidth: "92%",
								paddingBottom: choice.chipPadBottom,
								paddingHorizontal: choice.chipPadX,
								paddingTop: choice.chipPadTop,
							}}
						>
							<ClayText
								numberOfLines={1}
								style={{ flexShrink: 1, fontSize: choice.chipFont }}
								variant="title"
							>
								{name}
							</ClayText>
						</View>
					</View>
					{locked ? (
						<View
							pointerEvents="none"
							style={{
								alignItems: "center",
								backgroundColor: colors.sand,
								borderRadius: choice.lockBadge.size / 2,
								boxShadow: choice.lockBadge.shadow,
								height: choice.lockBadge.size,
								justifyContent: "center",
								marginTop: -choice.lockBadge.size * choice.lockBadge.up,
								position: "absolute",
								right: choice.lockBadge.right,
								top: "50%",
								width: choice.lockBadge.size,
							}}
						>
							<Icon
								color={colors.inkNavy}
								name="lock"
								size={choice.lockBadge.icon}
							/>
						</View>
					) : null}
					{drawing && !calm ? (
						<View
							pointerEvents="none"
							style={{
								borderRadius: choice.radius - choice.pad,
								bottom: choice.pad,
								left: choice.pad,
								overflow: "hidden",
								position: "absolute",
								right: choice.pad,
								top: choice.pad,
							}}
						>
							<Shimmer />
						</View>
					) : null}
				</ClayPressable>
			</Animated.View>
		</Animated.View>
	);
}
