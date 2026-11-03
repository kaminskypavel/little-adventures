import type { ImageSource } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";
import { EaseView } from "react-native-ease";
import { ClayPressable } from "./clay-pressable";
import { FallbackImage } from "./fallback-image";
import { Icon } from "./icons";
import { useCalm } from "./motion-provider";
import { Placeholder } from "./placeholder";
import {
	type ClayTone,
	clayFaces,
	colors,
	mapMedallion,
	motion,
	radii,
	shadows,
} from "./tokens";

export type MedallionState = "default" | "here" | "ready" | "done" | "drawing";

const tones: Record<MedallionState, ClayTone> = {
	default: "medal",
	done: "medal",
	drawing: "drawing",
	here: "sunReady",
	ready: "sunReady",
};

/** How far the ready ring swells (a scale) before it has faded out. */
const READY_RING_SCALE = 1.4;
const READY_RING_WIDTH = 4;
const READY_RING_ALPHA = 0.75;

/**
 * The ring of a place that waits to be touched: it swells from the rim and fades out, again and
 * again (`motion.pulse`, ease-out). Scale and opacity only, no shadow, on the platform's own
 * animator (react-native-ease), so an endless loop costs no per-frame work in the app.
 */
function ReadyRing() {
	return (
		<EaseView
			animate={{ opacity: 0, scale: READY_RING_SCALE }}
			initialAnimate={{ opacity: READY_RING_ALPHA, scale: 1 }}
			pointerEvents="none"
			style={{
				borderColor: colors.sun,
				borderRadius: radii.full,
				borderWidth: READY_RING_WIDTH,
				bottom: 0,
				left: 0,
				position: "absolute",
				right: 0,
				top: 0,
			}}
			transition={{
				duration: motion.pulse,
				easing: "easeOut",
				loop: "repeat",
				type: "timing",
			}}
		/>
	);
}

function CheckBadge() {
	return (
		<View
			style={{
				alignItems: "center",
				backgroundColor: colors.sun,
				borderRadius: radii.full,
				bottom: mapMedallion.badgeOffset,
				boxShadow: mapMedallion.badgeShadow,
				height: mapMedallion.badge,
				justifyContent: "center",
				position: "absolute",
				right: mapMedallion.badgeOffset,
				width: mapMedallion.badge,
			}}
		>
			<Icon color={colors.inkNavy} name="check" size={mapMedallion.badgeIcon} />
		</View>
	);
}

function Disc({
	picture,
	size,
	state,
}: {
	picture: ImageSource | number | null;
	size: number;
	state: MedallionState;
}) {
	const drawing = state === "drawing";
	return (
		<View
			style={{
				backgroundColor: colors.deepNavy,
				borderRadius: radii.full,
				flex: 1,
				overflow: "hidden",
			}}
		>
			<FallbackImage
				accessibilityIgnoresInvertColors
				blurRadius={drawing ? mapMedallion.drawingBlur : 0}
				contentFit="cover"
				kind="place"
				placeholder={
					<Placeholder
						icon="image"
						iconSize={Math.round(size * mapMedallion.iconRatio)}
						style={StyleSheet.absoluteFill}
					/>
				}
				source={picture}
				style={StyleSheet.absoluteFill}
			/>
			{drawing ? (
				<View
					pointerEvents="none"
					style={[
						StyleSheet.absoluteFill,
						{ backgroundColor: mapMedallion.drawingVeil },
					]}
				/>
			) : null}
		</View>
	);
}

/**
 * A place on the map: a round clay medal around the place picture.
 * `plain` is the end-map look: same face, not tappable, only the medallion drop shadow.
 */
export function Medallion({
	accessibilityLabel,
	onPress,
	picture,
	plain = false,
	size,
	state = "default",
	style,
}: {
	accessibilityLabel: string;
	onPress?: () => void;
	/** A bundled image or an image source, or null for the neutral picture placeholder. */
	picture: ImageSource | number | null;
	plain?: boolean;
	/** Defaults to 86, or 97 for `here`. */
	size?: number;
	state?: MedallionState;
	style?: StyleProp<ViewStyle>;
}) {
	const calm = useCalm();
	// A place that waits to be touched breathes a ring, unless calm is asked for or it cannot be
	// tapped right now (the star is walking).
	const waiting = state === "ready" && onPress !== undefined && !calm;
	const box =
		size ?? (state === "here" ? mapMedallion.sizeHere : mapMedallion.size);
	const ring =
		state === "here" || state === "ready"
			? mapMedallion.ringActive
			: mapMedallion.ring;
	const frame = {
		borderRadius: radii.full,
		height: box,
		padding: ring,
		width: box,
	} as const;
	const inside = (
		<>
			<Disc picture={picture} size={box} state={state} />
			{state === "done" ? <CheckBadge /> : null}
			{waiting ? <ReadyRing /> : null}
		</>
	);

	if (plain) {
		return (
			<LinearGradient
				accessibilityLabel={accessibilityLabel}
				colors={clayFaces[tones[state]]}
				pointerEvents="none"
				style={[frame, { boxShadow: shadows.medallion }, style]}
			>
				{inside}
			</LinearGradient>
		);
	}

	return (
		<ClayPressable
			accessibilityLabel={accessibilityLabel}
			onPress={onPress}
			radius={radii.full}
			style={[frame, style]}
			tone={tones[state]}
		>
			{inside}
		</ClayPressable>
	);
}
