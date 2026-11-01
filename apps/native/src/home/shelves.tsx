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
import { StyleSheet } from "react-native";
import type { AdventureSummary, Idea } from "@/src/data/types";

const SKELETONS = [0, 1, 2];
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
	if (adventures.length === 0) {
		return <EmptyDoor />;
	}
	return adventures.map((adventure) => (
		<StoryDoor
			done={adventure.partsDone}
			key={adventure.id}
			onPress={() => onOpen(adventure)}
			picture={adventure.picture}
			title={adventure.title}
			total={adventure.partsTotal}
		/>
	));
}

function Pictures({
	ideas,
	onAsk,
}: {
	ideas: Idea[] | null;
	onAsk: (question: string) => void;
}) {
	if (ideas === null) {
		return SKELETONS.map((n) => <IdeaSkeleton key={n} />);
	}
	return ideas.map((idea) => (
		<IdeaPicture
			key={idea.question}
			onPress={() => onAsk(idea.question)}
			picture={idea.picture}
			question={idea.question}
		/>
	));
}

/** The label and shelf of the child's own adventures, at `labelTop` and `top`. */
export function YoursShelf({
	adventures,
	labelTop,
	onOpen,
	top,
}: {
	adventures: AdventureSummary[] | null;
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
				Yours
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
				itemWidth={homeShelf.idea.size}
				style={[styles.shelf, { top }]}
			>
				<Pictures ideas={ideas} onAsk={onAsk} />
			</StoryShelf>
		</>
	);
}

const styles = StyleSheet.create({
	label: { left: LABEL_LEFT, position: "absolute" },
	shelf: { left: layout.sideMargin, position: "absolute", right: 0 },
});
