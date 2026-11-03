import { colors, type } from "@little-adventures/native-ui/tokens";
import { StyleSheet, Text, View } from "react-native";
import { useT } from "@/src/i18n";
import { notFoundStrings } from "@/src/i18n/strings/not-found";

export default function NotFoundScreen() {
	const t = useT(notFoundStrings);
	return (
		<View style={styles.root}>
			<Text style={styles.text}>{t("title")}</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	root: { alignItems: "center", flex: 1, justifyContent: "center" },
	text: { ...type.title, color: colors.cream },
});
