import { Image } from "expo-image";
import { type ReactNode, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SecondaryButton } from "./button";
import { Medallion, type MedallionState } from "./medallion";
import { SteppingStone } from "./stepping-stone";
import { colors, fonts, layout, radii, spacing } from "./tokens";

export type PlaceName =
	| "earth-rise"
	| "glow-flowers"
	| "moon-dust"
	| "moon-robot"
	| "the-box";

const PANEL_WIDTH = 346;
const PANEL_HEIGHT = 300;
const STONE_CELL = 100;
const PLAIN_SIZE = 60;
const STONES = [
	{ rotate: -12, variant: 1, width: 42 },
	{ rotate: 8, variant: 2, width: 47 },
	{ rotate: 20, variant: 3, width: 47 },
] as const;

function Meadow({ children, height }: { children: ReactNode; height: number }) {
	return (
		<View style={[styles.meadow, { height }]}>
			<Image
				accessibilityIgnoresInvertColors
				contentFit="cover"
				source={require("../assets/map/meadow.jpg")}
				style={StyleSheet.absoluteFill}
			/>
			<View
				pointerEvents="none"
				style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }]}
			/>
			{children}
		</View>
	);
}

function Labelled({ children, label }: { children: ReactNode; label: string }) {
	return (
		<View style={styles.labelled}>
			{children}
			<Text style={styles.label}>{label}</Text>
		</View>
	);
}

function StoneRow({ active }: { active: boolean }) {
	return (
		<View style={styles.stoneRow}>
			{STONES.map((stone) => (
				<View key={stone.variant} style={styles.stoneCell}>
					<SteppingStone
						active={active}
						rotate={stone.rotate}
						style={styles.stoneCenter}
						variant={stone.variant}
						width={stone.width}
					/>
				</View>
			))}
		</View>
	);
}

/**
 * Dev-only gallery: medallions in every state, pebbles with and without the glow, the placeholder
 * and the end-map plain medallion. `pictures` are the place pictures, bundled by the app.
 */
export function KitMap({ pictures }: { pictures: Record<PlaceName, number> }) {
	const [active, setActive] = useState(false);
	const states: { picture: PlaceName; state: MedallionState }[] = [
		{ picture: "the-box", state: "default" },
		{ picture: "moon-dust", state: "here" },
		{ picture: "earth-rise", state: "ready" },
		{ picture: "glow-flowers", state: "done" },
		{ picture: "moon-robot", state: "drawing" },
	];

	return (
		<View style={styles.block}>
			<Text style={styles.label}>
				Medallions: default, here, ready, done, drawing
			</Text>
			<Meadow height={PANEL_HEIGHT}>
				<View style={styles.medallions}>
					{states.map(({ picture, state }) => (
						<Labelled key={state} label={state}>
							<Medallion
								accessibilityLabel={`${state} medallion`}
								picture={pictures[picture]}
								state={state}
							/>
						</Labelled>
					))}
				</View>
			</Meadow>

			<Text style={styles.label}>Stepping stones at -12, 8, 20</Text>
			<Meadow height={STONE_CELL}>
				<StoneRow active={false} />
			</Meadow>

			<Text style={styles.label}>Stepping stones, active</Text>
			<Meadow height={STONE_CELL}>
				<StoneRow active={active} />
			</Meadow>
			<SecondaryButton
				label={active ? "Glow off" : "Glow on"}
				onPress={() => setActive((on) => !on)}
			/>

			<Text style={styles.label}>No picture, and plain at {PLAIN_SIZE} pt</Text>
			<Meadow height={STONE_CELL + spacing.xl}>
				<View style={styles.medallions}>
					<Labelled label="picture null">
						<Medallion accessibilityLabel="No picture" picture={null} />
					</Labelled>
					<Labelled label="plain">
						<Medallion
							accessibilityLabel="Plain medallion"
							picture={pictures["glow-flowers"]}
							plain
							size={PLAIN_SIZE}
						/>
					</Labelled>
				</View>
			</Meadow>
		</View>
	);
}

const styles = StyleSheet.create({
	block: { gap: layout.gap, paddingBottom: spacing.lg },
	label: { color: colors.cream, fontFamily: fonts.label, fontSize: 15 },
	labelled: { alignItems: "center", gap: layout.gapTight },
	meadow: {
		alignItems: "center",
		alignSelf: "center",
		borderRadius: radii.card,
		justifyContent: "center",
		overflow: "hidden",
		width: PANEL_WIDTH,
	},
	medallions: {
		alignItems: "center",
		flexDirection: "row",
		flexWrap: "wrap",
		gap: layout.gap,
		justifyContent: "center",
		padding: layout.gap,
	},
	stoneCell: { height: STONE_CELL, width: STONE_CELL },
	stoneCenter: { left: "50%", position: "absolute", top: "50%" },
	stoneRow: { flexDirection: "row" },
});
