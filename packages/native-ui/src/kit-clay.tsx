import { useState } from "react";
import { View } from "react-native";
import { useSharedValue } from "react-native-reanimated";
import { PrimaryButton, SecondaryButton } from "./button";
import { ClayPressable } from "./clay-pressable";
import { ClaySurface } from "./clay-surface";
import { ClayText } from "./clay-text";
import { HeroCard } from "./hero-card";
import { Hop } from "./hop";
import { IconButton } from "./icon-button";
import { Icon, iconNames } from "./icons";
import { colors, layout, radii } from "./tokens";

function Caption({ children }: { children: string }) {
	return (
		<ClayText color={colors.cream} style={{ opacity: 0.85 }} variant="label">
			{children}
		</ClayText>
	);
}

function Item({
	children,
	label,
}: {
	children: React.ReactNode;
	label: string;
}) {
	return (
		<View style={{ gap: layout.gapTight }}>
			{children}
			<Caption>{label}</Caption>
		</View>
	);
}

/** Dev-only gallery: every clay component in every state. */
export function KitClay() {
	const [picked, setPicked] = useState(false);
	const [taps, setTaps] = useState(0);
	const held = useSharedValue(1);

	return (
		<View style={{ gap: layout.gap }}>
			<ClayText color={colors.cream} variant="title">
				Clay core
			</ClayText>

			<Item label="primary button, rest (tap it)">
				<PrimaryButton label="Let's go" onPress={() => setTaps((n) => n + 1)} />
			</Item>
			<Item label="primary button, with icon">
				<PrimaryButton icon="mic" label="Ask your own" />
			</Item>
			<Item label="primary button, off">
				<PrimaryButton icon="mic-off" label="Mic is off" tone="off" />
			</Item>
			<Item label={`taps counted on release: ${taps}`}>
				<View />
			</Item>

			<Item label="secondary button, rest">
				<SecondaryButton label="I have an account" />
			</Item>
			<Item label="secondary button, selected (tap to toggle)">
				<SecondaryButton
					label="Draw again"
					onPress={() => setPicked((v) => !v)}
					selected={picked}
				/>
			</Item>
			<Item label="secondary button, locked">
				<SecondaryButton label="Other ideas" tone="locked" />
			</Item>
			<Item label="secondary button, off">
				<SecondaryButton label="Sign out" tone="off" />
			</Item>

			<Item label="icon buttons: rest, selected, off, locked">
				<View style={{ flexDirection: "row", gap: layout.gap }}>
					<IconButton accessibilityLabel="Grown-ups" icon="lock" />
					<IconButton accessibilityLabel="Back to map" icon="back" selected />
					<IconButton accessibilityLabel="Mic" icon="mic-off" tone="off" />
					<IconButton accessibilityLabel="Locked" icon="lock" tone="locked" />
				</View>
			</Item>

			<Item label="icon family, 24 grid, 30 pt">
				<View
					style={{ flexDirection: "row", flexWrap: "wrap", gap: layout.gap }}
				>
					{iconNames.map((name) => (
						<View
							key={name}
							style={{
								alignItems: "center",
								backgroundColor: colors.sand,
								borderRadius: radii.plate,
								height: layout.minTarget,
								justifyContent: "center",
								width: layout.minTarget,
							}}
						>
							<Icon name={name} />
						</View>
					))}
				</View>
			</Item>

			<Item label="hero card, rest (tap it)">
				<HeroCard label={"New\nadventure"} />
			</Item>
			<Item label="hero card, off">
				<HeroCard label={"Mic is\noff"} off />
			</Item>

			<Item label="hop (2800 ms, still under reduced motion)">
				<Hop style={{ alignSelf: "flex-start" }}>
					<View
						style={{
							alignItems: "center",
							backgroundColor: colors.sand,
							borderRadius: radii.full,
							height: layout.minTarget,
							justifyContent: "center",
							width: layout.minTarget,
						}}
					>
						<Icon name="mic" />
					</View>
				</Hop>
			</Item>

			<Item label="rest and held down, side by side">
				<View style={{ flexDirection: "row", gap: layout.gap }}>
					<ClaySurface
						radius={radii.button}
						style={{ height: layout.primaryHeight, width: 150 }}
						tone="sun"
					/>
					<ClaySurface
						pressed={held}
						radius={radii.button}
						style={{ height: layout.primaryHeight, width: 150 }}
						tone="sun"
					/>
				</View>
			</Item>

			<Item label="bare pressable with a child">
				<ClayPressable
					accessibilityLabel="Bare pressable"
					radius={radii.card}
					style={{
						alignItems: "center",
						height: layout.minTarget,
						justifyContent: "center",
						width: 200,
					}}
					tone="field"
				>
					<ClayText variant="label">Press me</ClayText>
				</ClayPressable>
			</Item>
		</View>
	);
}
