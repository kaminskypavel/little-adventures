import type { ImageSource } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";
import { ClayPressable } from "./clay-pressable";
import { FallbackImage } from "./fallback-image";
import { Icon } from "./icons";
import { Placeholder } from "./placeholder";
import {
	type ClayTone,
	clayFaces,
	colors,
	mapMedallion,
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
