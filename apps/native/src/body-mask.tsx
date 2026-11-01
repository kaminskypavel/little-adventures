import type { BodyMask } from "@little-adventures/native-ui/body-fade";
import MaskedView from "@react-native-masked-view/masked-view";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View } from "react-native";

const SOLID = "#000";
const CLEAR = "rgba(0,0,0,0)";

/**
 * The native body fade (iOS and Android): MaskedView reads only the alpha of its mask, so the
 * last `height` pt of the content fade to nothing. Web uses a CSS mask inside `Screen`.
 */
export const FadeBottom: BodyMask = ({ children, height }) => (
	<MaskedView
		androidRenderingMode="software"
		maskElement={
			<View style={styles.fill}>
				<View style={styles.solid} />
				<LinearGradient colors={[SOLID, CLEAR]} style={{ height }} />
			</View>
		}
		style={styles.fill}
	>
		{children}
	</MaskedView>
);

const styles = StyleSheet.create({
	fill: { backgroundColor: "transparent", flex: 1 },
	solid: { backgroundColor: SOLID, flex: 1 },
});
