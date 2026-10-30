import { KitSelect } from "@little-adventures/native-ui/kit-select";
import { layout } from "@little-adventures/native-ui/tokens";
import { ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Dev-only component gallery.
export default function KitSelectScreen() {
	const insets = useSafeAreaInsets();

	return (
		<ScrollView
			contentContainerStyle={[
				styles.content,
				{ paddingBottom: insets.bottom, paddingTop: insets.top },
			]}
			keyboardShouldPersistTaps="handled"
		>
			<KitSelect />
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	content: {
		gap: layout.gap,
		paddingHorizontal: layout.sideMargin,
	},
});
