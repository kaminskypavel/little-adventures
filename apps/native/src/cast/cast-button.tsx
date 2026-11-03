import { ClaySurface } from "@little-adventures/native-ui/clay-surface";
import { colors, layout, radii } from "@little-adventures/native-ui/tokens";
import { StyleSheet, View } from "react-native";
import { CastButton as NativeCastButton } from "react-native-google-cast";

/**
 * The Cast button on iOS and Android: the same sage clay circle as the other round buttons, with
 * the system's own Cast control on top, which finds TVs and opens the system's TV list.
 */
export function CastButton() {
	return (
		<View style={styles.box} testID="cast-button">
			<ClaySurface
				radius={radii.full}
				style={StyleSheet.absoluteFill}
				tone="sage"
			/>
			<NativeCastButton
				accessibilityLabel="Play on the TV"
				style={styles.native}
				tintColor={colors.inkNavy}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	box: { height: layout.minTarget, width: layout.minTarget },
	native: { height: layout.minTarget, width: layout.minTarget },
});
