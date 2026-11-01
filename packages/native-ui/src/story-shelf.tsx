import type { ReactNode } from "react";
import { ScrollView, type StyleProp, type ViewStyle } from "react-native";
import { layout, storyCover } from "./tokens";

const { shadowRoom } = storyCover.shelf;

/**
 * Home's sideways shelf. It starts at the screen margin, bleeds to the right screen edge so the
 * next item is cut off, and snaps one item at a time. The items are `StoryCover size="shelf"`
 * unless `itemWidth` and `gap` say otherwise.
 * Place it inside a body that has `layout.sideMargin` padding.
 */
export function StoryShelf({
	children,
	gap = storyCover.shelf.gap,
	itemWidth = storyCover.shelf.width,
	style,
}: {
	children: ReactNode;
	/** Space between items. */
	gap?: number;
	/** Width of one item, for the snap. */
	itemWidth?: number;
	style?: StyleProp<ViewStyle>;
}) {
	return (
		<ScrollView
			contentContainerStyle={{
				gap,
				paddingBottom: shadowRoom,
				paddingRight: layout.sideMargin,
			}}
			decelerationRate="fast"
			horizontal
			showsHorizontalScrollIndicator={false}
			snapToAlignment="start"
			snapToInterval={itemWidth + gap}
			style={[
				{
					flexGrow: 0,
					marginBottom: -shadowRoom,
					marginRight: -layout.sideMargin,
				},
				style,
			]}
		>
			{children}
		</ScrollView>
	);
}
