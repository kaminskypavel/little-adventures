import { KitMap } from "@little-adventures/native-ui/kit-map";
import { colors, layout, type } from "@little-adventures/native-ui/tokens";
import { ScrollView, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const pictures = {
	"earth-rise": require("../assets/story/places/earth-rise.jpg"),
	"glow-flowers": require("../assets/story/places/glow-flowers.jpg"),
	"moon-dust": require("../assets/story/places/moon-dust.jpg"),
	"moon-robot": require("../assets/story/places/moon-robot.jpg"),
	"the-box": require("../assets/story/places/the-box.jpg"),
};

// Dev-only gallery of the map pieces.
export default function KitMapRoute() {
	const insets = useSafeAreaInsets();

	return (
		<ScrollView
			contentContainerStyle={[
				styles.content,
				{ paddingBottom: insets.bottom, paddingTop: insets.top },
			]}
		>
			<Text style={styles.heading}>Map pieces</Text>
			<KitMap pictures={pictures} />
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	content: {
		gap: layout.gap,
		paddingHorizontal: layout.sideMargin,
	},
	heading: { ...type.headline, color: colors.cream },
});
