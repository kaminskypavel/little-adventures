import { useState } from "react";
import { Pressable, View } from "react-native";
import { ChoiceCard } from "./choice-card";
import { ClayText } from "./clay-text";
import { ListRow } from "./list-row";
import { PictureRow } from "./picture-row";
import { RowCard } from "./row-card";
import { colors, layout, radii } from "./tokens";

/** Test pictures, handed in by the route so this package owns no app assets. Missing ones show the placeholder. */
export interface KitCardPictures {
	boxThatFlew?: number;
	earthRise?: number;
	glowFlowers?: number;
	ideaBee?: number;
	ideaMoon?: number;
	moonDust?: number;
	moonGate?: number;
	whaleSongs?: number;
}

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

/** Dev-only gallery: list rows, row cards, picture rows and choice cards. */
export function KitCards({ pictures = {} }: { pictures?: KitCardPictures }) {
	const [picked, setPicked] = useState<"earth" | "glow" | null>(null);
	const [run, setRun] = useState(0);
	const [taps, setTaps] = useState(0);
	const pic = (value: number | undefined) => value ?? null;

	return (
		<View style={{ gap: layout.gap }}>
			<ClayText color={colors.cream} variant="title">
				Cards
			</ClayText>

			<Item label="list row (Keep going), tap it">
				<ListRow
					caption="2 of 6 places"
					onPress={() => setTaps((n) => n + 1)}
					picture={pic(pictures.moonDust)}
					title="The Box That Flew"
				/>
			</Item>
			<Item label={`list row, second (taps counted on release: ${taps})`}>
				<ListRow
					caption="1 of 6 places"
					picture={pic(pictures.whaleSongs)}
					title="Whale songs"
				/>
			</Item>
			<Item label="list row, long title (ellipsis as last resort)">
				<ListRow
					caption="3 of 6 places"
					picture={pic(pictures.whaleSongs)}
					title="The Very Long Night Of The Singing Whales"
				/>
			</Item>

			<Item label="row card with count (Finished)">
				<RowCard
					count="1"
					picture={pic(pictures.boxThatFlew)}
					title="Finished"
				/>
			</Item>
			<Item label="row card with subtitle (Adventures list)">
				<RowCard
					picture={pic(pictures.boxThatFlew)}
					subtitle="6 of 6, 4 things found"
					title="The Box That Flew"
				/>
			</Item>
			<Item label="row card, no picture">
				<RowCard
					picture={null}
					subtitle="6 of 6, 4 things found"
					title="The Box That Flew"
				/>
			</Item>

			<Item label="picture row (Pick idea 1)">
				<PictureRow
					picture={pic(pictures.ideaMoon)}
					title="Why does the moon change shape?"
				/>
			</Item>
			<Item label="picture row (Pick idea 2)">
				<PictureRow
					picture={pic(pictures.ideaBee)}
					title="How do bees make honey?"
				/>
			</Item>

			<Item label="replay the pulse (remounts the two open cards)">
				<Pressable
					accessibilityLabel="Replay pulse"
					accessibilityRole="button"
					onPress={() => setRun((n) => n + 1)}
					style={{
						alignSelf: "flex-start",
						backgroundColor: colors.sand,
						borderRadius: radii.full,
						paddingHorizontal: 22,
						paddingVertical: 10,
					}}
				>
					<ClayText variant="label">Replay pulse</ClayText>
				</Pressable>
			</Item>
			<Item label="choice cards, open: pulse 0 then 1000, tap toggles the ring">
				<View key={run} style={{ gap: layout.gap }}>
					<ChoiceCard
						name="Glow flowers"
						onPress={() => setPicked(picked === "glow" ? null : "glow")}
						picture={pic(pictures.glowFlowers)}
						pulseDelay={0}
						selected={picked === "glow"}
					/>
					<ChoiceCard
						name="Earth rise"
						onPress={() => setPicked(picked === "earth" ? null : "earth")}
						picture={pic(pictures.earthRise)}
						pulseDelay={1000}
						selected={picked === "earth"}
					/>
				</View>
			</Item>
			<Item label="choice card, locked goal (tap: shake and warning tick)">
				<ChoiceCard
					kind="goal"
					name="Goodnight"
					picture={pic(pictures.moonGate)}
					state="locked"
				/>
			</Item>
			<Item label="choice card, open goal">
				<ChoiceCard
					kind="goal"
					name="Goodnight"
					picture={pic(pictures.moonGate)}
				/>
			</Item>
			<Item label="choice card, drawing (blur, gray, shimmer)">
				<ChoiceCard
					name="Moon dust"
					picture={pic(pictures.moonDust)}
					state="drawing"
				/>
			</Item>
			<Item label="choice card, no picture">
				<ChoiceCard name="Sleepy whale" picture={null} />
			</Item>
		</View>
	);
}
