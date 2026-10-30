import "@/global.css";

import {
	Nunito_700Bold,
	Nunito_800ExtraBold,
	Nunito_900Black,
	useFonts,
} from "@expo-google-fonts/nunito";
import { MotionProvider } from "@little-adventures/native-ui/motion-provider";
import { Sky } from "@little-adventures/native-ui/sky";
import { colors } from "@little-adventures/native-ui/tokens";
import { DarkTheme, Stack, ThemeProvider } from "expo-router";
import { hideAsync, preventAutoHideAsync } from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { PhoneFrame } from "@/components/phone-frame";

preventAutoHideAsync();

// The navigation theme paints its own background; make it clear so the Sky shows.
const clearTheme = {
	...DarkTheme,
	colors: {
		...DarkTheme.colors,
		background: "transparent",
		card: "transparent",
	},
};

export default function Layout() {
	const [loaded, error] = useFonts({
		Nunito_700Bold,
		Nunito_800ExtraBold,
		Nunito_900Black,
	});
	const ready = loaded || error !== null;

	useEffect(() => {
		if (ready) {
			hideAsync();
		}
	}, [ready]);

	if (!ready) {
		return null;
	}

	return (
		<GestureHandlerRootView style={styles.root}>
			<PhoneFrame>
				<MotionProvider>
					<View style={styles.field}>
						<Sky />
						<ThemeProvider value={clearTheme}>
							<Stack
								screenOptions={{
									animation: "fade",
									contentStyle: { backgroundColor: "transparent" },
									headerShown: false,
								}}
							/>
						</ThemeProvider>
					</View>
					<StatusBar style="light" />
				</MotionProvider>
			</PhoneFrame>
		</GestureHandlerRootView>
	);
}

const styles = StyleSheet.create({
	field: { backgroundColor: colors.fieldNavy, flex: 1 },
	root: { flex: 1 },
});
