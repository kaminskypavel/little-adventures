import { ClayText } from "@little-adventures/native-ui/clay-text";
import { colors, radii } from "@little-adventures/native-ui/tokens";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { isAdminMe } from "./use-is-admin";
import { useMe } from "./use-me";

const KEY = "admin-hint-seen";
const SHOWN_MS = 8000;

/**
 * Tells an admin once that the switches live behind a 1 s hold on the title. Remembered in
 * AsyncStorage when it first shows, so it never comes back. Mounted once in the root layout.
 */
export function AdminHint() {
	const admin = isAdminMe(useMe());
	const [shown, setShown] = useState(false);

	useEffect(() => {
		if (!admin) {
			return;
		}
		let live = true;
		let timer: ReturnType<typeof setTimeout> | undefined;
		const show = async () => {
			if (await AsyncStorage.getItem(KEY)) {
				return;
			}
			if (live) {
				setShown(true);
				timer = setTimeout(() => setShown(false), SHOWN_MS);
			}
			await AsyncStorage.setItem(KEY, "1");
		};
		show().catch(() => undefined);
		return () => {
			live = false;
			clearTimeout(timer);
		};
	}, [admin]);

	if (!shown) {
		return null;
	}
	return (
		<View
			accessibilityLiveRegion="polite"
			pointerEvents="none"
			role="status"
			style={styles.wrap}
		>
			<View style={styles.pill}>
				<ClayText color={colors.cream} variant="label">
					Admins: hold the title for switches
				</ClayText>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	pill: {
		backgroundColor: colors.scrim,
		borderRadius: radii.full,
		paddingHorizontal: 18,
		paddingVertical: 8,
	},
	// The home indicator band under the dock, clear of the buttons.
	wrap: {
		alignItems: "center",
		bottom: 6,
		left: 0,
		position: "absolute",
		right: 0,
	},
});
