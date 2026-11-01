import type { BodyMask } from "@little-adventures/native-ui/body-fade";
import MaskedView from "@react-native-masked-view/masked-view";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View } from "react-native";

const SOLID = "#000";
const CLEAR = "rgba(0,0,0,0)";

/**
 * The native body fade (iOS and Android): MaskedView reads only the alpha of its mask, so the
 * first `top` pt fade in and the last `height` pt fade to nothing. Web uses a CSS mask inside `Screen`.
 */
export const FadeBottom: BodyMask = ({ children, height, top }) => (
	<MaskedView
		androidRenderingMode="software"
		maskElement={
			<View style={styles.fill}>
				{top > 0 ? (
					<LinearGradient colors={[CLEAR, SOLID]} style={{ height: top }} />
				) : null}
				<View style={styles.solid} />
				{height > 0 ? (
					<LinearGradient colors={[SOLID, CLEAR]} style={{ height }} />
				) : null}
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
