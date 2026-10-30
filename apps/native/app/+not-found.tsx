import { colors, type } from "@little-adventures/native-ui/tokens";
import { StyleSheet, Text, View } from "react-native";

export default function NotFoundScreen() {
	return (
		<View style={styles.root}>
			<Text style={styles.text}>Page not found</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	root: { alignItems: "center", flex: 1, justifyContent: "center" },
	text: { ...type.title, color: colors.cream },
});
