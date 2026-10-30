import { colors, type } from "@little-adventures/native-ui/tokens";
import { StyleSheet, Text, View } from "react-native";

export default function Index() {
	return (
		<View style={styles.root}>
			<Text style={styles.title}>Little Adventures</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	root: { alignItems: "center", flex: 1, justifyContent: "center" },
	title: { ...type.display, color: colors.cream, textAlign: "center" },
});
