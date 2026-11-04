import { ClayText } from "@little-adventures/native-ui/clay-text";
import {
	IdeaPicture,
	IdeaSkeleton,
} from "@little-adventures/native-ui/idea-picture";
import {
	DoorSkeleton,
	EmptyDoor,
	StoryDoor,
} from "@little-adventures/native-ui/story-door";
import { StoryShelf } from "@little-adventures/native-ui/story-shelf";
import { colors, homeShelf, layout } from "@little-adventures/native-ui/tokens";
import { StyleSheet, useWindowDimensions } from "react-native";
import type { AdventureSummary, Idea } from "@/src/data/types";

const SKELETONS = [0, 1, 2];
// The doors a full row shows on a phone: fewer stories leave the rest as empty doors.
const EMPTY_SLOTS = [0, 1, 2, 3];
// Label and shelf sit at these offsets from the left: the label a little in from the margin.
const LABEL_LEFT = 26;

function Doors({
	adventures,
	onOpen,
}: {
	adventures: AdventureSummary[] | null;
	onOpen: (adventure: AdventureSummary) => void;
}) {
	if (adventures === null) {
		return SKELETONS.map((n) => <DoorSkeleton key={n} />);
	}
	// A short shelf is topped up with empty doors, so the row never looks bare.
	const empty = EMPTY_SLOTS.slice(adventures.length);
	return [
		...adventures.map((adventure) => (
			<StoryDoor
				done={adventure.partsDone}
				key={adventure.id}
				onPress={() => onOpen(adventure)}
				picture={adventure.picture}
				title={adventure.title}
				total={adventure.partsTotal}
			/>
		)),
		...empty.map((n) => <EmptyDoor key={`empty-${n}`} />),
	];
}

function Pictures({
	ideas,
	onAsk,
	size,
}: {
	ideas: Idea[] | null;
	onAsk: (question: string) => void;
	size: number;
}) {
	if (ideas === null) {
		return SKELETONS.map((n) => <IdeaSkeleton key={n} size={size} />);
	}
	return ideas.map((idea, index) => (
		<IdeaPicture
			key={idea.question}
			onPress={() => onAsk(idea.question)}
			picture={idea.picture}
			question={idea.question}
			size={size}
			testID={`idea-${index}`}
		/>
	));
}

/** The idea diameter that fits every idea between the side margins, never above the design's. */
export const ideaSizeFor = (screenWidth: number, count: number) => {
	const { gap, size } = homeShelf.idea;
	const room = screenWidth - 2 * layout.sideMargin - (count - 1) * gap;
	return Math.min(size, Math.floor(room / Math.max(1, count)));
};

/** The label and shelf of the child's own adventures, at `labelTop` and `top`. */
export function YoursShelf({
	adventures,
	label,
	labelTop,
	onOpen,
	top,
}: {
	adventures: AdventureSummary[] | null;
	label: string;
	labelTop: number;
	onOpen: (adventure: AdventureSummary) => void;
	top: number;
}) {
	return (
		<>
			<ClayText
				color={colors.cream}
				style={[styles.label, { top: labelTop }]}
				variant="label"
			>
				{label}
			</ClayText>
			<StoryShelf
				gap={homeShelf.door.gap}
				itemWidth={homeShelf.door.width}
				style={[styles.shelf, { top }]}
			>
				<Doors adventures={adventures} onOpen={onOpen} />
			</StoryShelf>
		</>
	);
}

/** The label and shelf of ideas, at `labelTop` and `top`. */
export function IdeasShelf({
	ideas,
	label,
	labelTop,
	onAsk,
	top,
}: {
	ideas: Idea[] | null;
	label: string;
	labelTop: number;
	onAsk: (question: string) => void;
	top: number;
}) {
	// The whole row fits on the screen: no idea hides past the edge.
	const size = ideaSizeFor(
		useWindowDimensions().width,
		ideas?.length ?? SKELETONS.length
	);
	return (
		<>
			<ClayText
				color={colors.cream}
				style={[styles.label, { top: labelTop }]}
				variant="label"
			>
				{label}
			</ClayText>
			<StoryShelf
				gap={homeShelf.idea.gap}
				itemWidth={size}
				style={[styles.shelf, { top }]}
			>
				<Pictures ideas={ideas} onAsk={onAsk} size={size} />
			</StoryShelf>
		</>
	);
}

const styles = StyleSheet.create({
	label: { left: LABEL_LEFT, position: "absolute" },
	shelf: { left: layout.sideMargin, position: "absolute", right: 0 },
});
