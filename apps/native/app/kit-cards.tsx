import { KitCards } from "@little-adventures/native-ui/kit-cards";
import { colors, layout, type } from "@little-adventures/native-ui/tokens";
import { ScrollView, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const pictures = {
	boxThatFlew: require("../assets/story/places/the-box.jpg"),
	earthRise: require("../assets/story/places/earth-rise.jpg"),
	glowFlowers: require("../assets/story/places/glow-flowers.jpg"),
	ideaBee: require("../assets/story/idea-bee.jpg"),
	ideaMoon: require("../assets/story/idea-moon.jpg"),
	moonDust: require("../assets/story/places/moon-dust.jpg"),
	moonGate: require("../assets/story/moon-gate.png"),
	whaleSongs: require("../assets/story/places/whale-songs.jpg"),
};

// Dev-only gallery for list rows, picture rows and choice cards.
export default function KitCardsRoute() {
	const insets = useSafeAreaInsets();

	return (
		<ScrollView
			contentContainerStyle={[
				styles.content,
				{ paddingBottom: insets.bottom + layout.gap, paddingTop: insets.top },
			]}
		>
			<Text style={styles.heading}>Kit cards</Text>
			<KitCards pictures={pictures} />
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
