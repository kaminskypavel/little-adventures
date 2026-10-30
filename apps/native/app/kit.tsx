import { KitClay } from "@little-adventures/native-ui/kit-clay";
import { KitStar } from "@little-adventures/native-ui/kit-star";
import { colors, layout, type } from "@little-adventures/native-ui/tokens";
import { ScrollView, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Dev-only component gallery.
export default function Kit() {
	const insets = useSafeAreaInsets();

	return (
		<ScrollView
			contentContainerStyle={[
				styles.content,
				{ paddingBottom: insets.bottom, paddingTop: insets.top },
			]}
		>
			<Text style={styles.heading}>Kit</Text>
			<KitClay />
			<KitStar />
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
