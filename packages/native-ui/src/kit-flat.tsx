import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import {
	cancelAnimation,
	Easing,
	ReduceMotion,
	useSharedValue,
	withRepeat,
	withTiming,
} from "react-native-reanimated";
import { ClayText } from "./clay-text";
import { FoundPanel } from "./found-panel";
import { HoldGate } from "./hold-gate";
import { NamePill } from "./name-pill";
import { NarrationBar } from "./narration-bar";
import { Plate } from "./plate";
import { ProgressBar } from "./progress-bar";
import { QuestionCard } from "./question-card";
import { StatusPill } from "./status-pill";
import { colors, fonts, layout } from "./tokens";

const CAPTION_SIZE = 15;

const statuses = [
	"Mixing the clay",
	"Shaping the moon",
	"Almost there",
	"All ready",
];
const STATUS_EVERY_MS = 2000;
const LOOP_MS = 6000;
const narration = "Noa scooped up the silver dust and watched it float.".split(
	" "
);

function Item({
	children,
	label,
}: {
	children: React.ReactNode;
	label: string;
}) {
	return (
		<View style={{ gap: layout.gapTight }}>
			<Text
				style={{
					color: colors.cream,
					fontFamily: fonts.label,
					fontSize: CAPTION_SIZE,
				}}
			>
				{label}
			</Text>
			{children}
		</View>
	);
}

/** Dev-only gallery: every flat piece and the hold gate. */
export function KitFlat() {
	const [status, setStatus] = useState(0);
	const [opened, setOpened] = useState(false);
	const loop = useSharedValue(0);

	useEffect(() => {
		const id = setInterval(
			() => setStatus((n) => (n + 1) % statuses.length),
			STATUS_EVERY_MS
		);
		return () => clearInterval(id);
	}, []);

	useEffect(() => {
		loop.set(
			withRepeat(
				withTiming(1, {
					duration: LOOP_MS,
					easing: Easing.linear,
					reduceMotion: ReduceMotion.Never,
				}),
				-1,
				false,
				undefined,
				ReduceMotion.Never
			)
		);
		return () => cancelAnimation(loop);
	}, [loop]);

	return (
		<View style={{ gap: layout.gap }}>
			<ClayText color={colors.cream} variant="title">
				Flat pieces
			</ClayText>

			<Item label="plate, place">
				<Plate label="Moon dust" />
			</Item>
			<Item label="plate, place, lock">
				<Plate icon="lock" label="Earth rise" />
			</Item>
			<Item label="plate, place, check">
				<Plate icon="check" label="Glow flowers" />
			</Item>
			<Item label="plate, big">
				<Plate label="Goodnight moon" variant="big" />
			</Item>
			<Item label="plate, hero">
				<Plate label="Noa, the hero" variant="hero" />
			</Item>
			<Item label="plate, question">
				<Plate label="How do you get to the moon?" variant="question" />
			</Item>

			<Item label="question card">
				<QuestionCard text="Why do whales sing?" />
			</Item>

			<Item label="found panel">
				<FoundPanel
					items={[
						"Moon dust keeps footprints",
						"Earth is a blue marble",
						"Some flowers glow",
						"A robot can be a friend",
					]}
				/>
			</Item>

			<Item label="name pill">
				<NamePill text="Moon dust" />
			</Item>

			<Item label="narration bar, word 4, 40 percent">
				<NarrationBar current={4} progress={0.4} words={narration} />
			</Item>

			<Item label="progress bar, 0 to 1 over 6 s">
				<ProgressBar progress={loop} />
			</Item>

			<Item label="status pill, every 2 s">
				<StatusPill text={statuses[status] ?? ""} />
			</Item>

			<Item label="hold gate: hold 3 s">
				<View style={{ alignItems: "center", gap: layout.gapTight }}>
					<HoldGate onOpen={() => setOpened(true)} />
					{opened ? (
						<ClayText color={colors.cream} variant="title">
							Opened!
						</ClayText>
					) : null}
				</View>
			</Item>
		</View>
	);
}
