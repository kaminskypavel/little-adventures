import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { ClayPressable } from "./clay-pressable";
import { Icon } from "./icons";
import { useCalm } from "./motion-provider";
import { Placeholder } from "./placeholder";
import {
	clayFaces,
	colors,
	portrait as dims,
	listCards,
	motion,
} from "./tokens";

const { choice } = listCards;

/** A round portrait with its camera badge at the bottom right. `children` is the picture. */
export function Portrait({
	cameraLabel,
	children,
	onCamera,
	size = dims.grownUp,
}: {
	cameraLabel: string;
	children: ReactNode;
	onCamera: () => void;
	size?: number;
}) {
	return (
		<View style={{ height: size, width: size }}>
			{children}
			{/* Sky navy ring round the badge, drawn outside its box. */}
			<View
				style={{
					borderRadius: dims.badge / 2,
					bottom: 0,
					boxShadow: `0px 0px 0px ${dims.badgeRing}px ${colors.skyNavy}`,
					position: "absolute",
					right: 0,
				}}
			>
				<ClayPressable
					accessibilityLabel={cameraLabel}
					onPress={onCamera}
					radius={dims.badge / 2}
					style={{
						alignItems: "center",
						height: dims.badge,
						justifyContent: "center",
						width: dims.badge,
					}}
				>
					<Icon color={colors.inkNavy} name="camera" size={dims.badgeIcon} />
				</ClayPressable>
			</View>
		</View>
	);
}

/**
 * The picture inside a `Portrait`: the art (or photo), the neutral placeholder when there is none,
 * or, while the art is drawn, the Drawing clay with the map's slow shimmer.
 */
export function PortraitArt({
	accessibilityLabel,
	drawing = false,
	image,
	size = dims.grownUp,
}: {
	accessibilityLabel?: string;
	drawing?: boolean;
	image: { cacheKey?: string; uri: string } | null;
	size?: number;
}) {
	const calm = useCalm();
	const frame = {
		borderColor: colors.sand,
		borderRadius: size / 2,
		borderWidth: dims.border,
		height: size,
		width: size,
	} as const;
	if (image) {
		return (
			<Image
				accessibilityIgnoresInvertColors
				accessibilityLabel={accessibilityLabel}
				cachePolicy="memory-disk"
				contentFit="cover"
				source={image}
				style={frame}
			/>
		);
	}
	if (!drawing) {
		return <Placeholder icon="user" style={frame} />;
	}
	// The band is as wide as the circle: off the left edge at the start, off the right at the end.
	const inner = size - dims.border * 2;
	const sweep = {
		from: { transform: [{ translateX: -1.05 * inner }] },
		to: { transform: [{ translateX: 2.55 * inner }] },
	};
	return (
		<View style={[frame, { overflow: "hidden" }]}>
			<LinearGradient
				colors={clayFaces.drawing}
				style={StyleSheet.absoluteFill}
			/>
			{calm ? null : (
				<Animated.View
					pointerEvents="none"
					style={{
						animationDuration: `${motion.shimmer}ms`,
						animationIterationCount: "infinite",
						animationName: sweep,
						animationTimingFunction: "linear",
						bottom: "-30%",
						position: "absolute",
						top: "-30%",
						width: inner,
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
			)}
		</View>
	);
}
