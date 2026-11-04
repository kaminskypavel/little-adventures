import type { ReactNode } from "react";
import { ScrollView, type StyleProp, type ViewStyle } from "react-native";
import { layout, storyCover } from "./tokens";

const { shadowRoom } = storyCover.shelf;

/**
 * Home's sideways shelf. Its first item starts at the screen margin, and it bleeds to both screen
 * edges, so a scrolled item slides off the edge instead of being clipped at the margin. It snaps
 * one item at a time. The items are `StoryCover size="shelf"`
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
				paddingLeft: layout.sideMargin,
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
					marginLeft: -layout.sideMargin,
					marginRight: -layout.sideMargin,
				},
				style,
			]}
		>
			{children}
		</ScrollView>
	);
}
