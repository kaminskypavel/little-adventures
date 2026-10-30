import { KitFlat } from "@little-adventures/native-ui/kit-flat";
import { layout } from "@little-adventures/native-ui/tokens";
import { ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Dev-only gallery of the flat pieces and the hold gate.
export default function KitFlatRoute() {
	const insets = useSafeAreaInsets();

	return (
		<ScrollView
			contentContainerStyle={[
				styles.content,
				{ paddingBottom: insets.bottom, paddingTop: insets.top },
			]}
		>
			<KitFlat />
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	content: { paddingHorizontal: layout.sideMargin },
});
