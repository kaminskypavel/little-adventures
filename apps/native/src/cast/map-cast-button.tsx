import { layout } from "@little-adventures/native-ui/tokens";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CastButton } from "./cast-button";

/**
 * The Cast button on the upright map, in the top corner with the Grown-ups lock, just inside it,
 * the same button as in the place player. It floats over the map and is not part of the map's
 * picture. (Sideways, the TV is a row of the adventure menu.)
 */
export function MapCastButton() {
	const insets = useSafeAreaInsets();
	return (
		<View
			pointerEvents="box-none"
			style={[
				styles.row,
				{
					marginTop: insets.top + layout.topBarOffset,
					right:
						insets.right + layout.sideMargin + layout.minTarget + layout.gap,
				},
			]}
		>
			<CastButton />
		</View>
	);
}

const styles = StyleSheet.create({
	row: {
		alignItems: "center",
		height: layout.topBarHeight,
		position: "absolute",
	},
});
