import type { ReactNode } from "react";
import { ScrollView, type StyleProp, type ViewStyle } from "react-native";
import { layout, storyCover } from "./tokens";

const { gap, shadowRoom, width } = storyCover.shelf;

/**
 * Home's sideways shelf of `StoryCover size="shelf"`. It starts at the screen margin, bleeds to the
 * right screen edge so the next cover is cut off, and snaps one cover at a time.
 * Place it inside a body that has `layout.sideMargin` padding.
 */
export function StoryShelf({
	children,
	style,
}: {
	children: ReactNode;
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
			snapToInterval={width + gap}
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
