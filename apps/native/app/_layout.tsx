import "@/global.css";

import {
	Nunito_700Bold,
	Nunito_800ExtraBold,
	Nunito_900Black,
	useFonts,
} from "@expo-google-fonts/nunito";
import { BackProvider } from "@little-adventures/native-ui/back-button";
import { BodyFadeProvider } from "@little-adventures/native-ui/body-fade";
import { FallbackArtProvider } from "@little-adventures/native-ui/fallback-image";
import { MotionProvider } from "@little-adventures/native-ui/motion-provider";
import { Sky } from "@little-adventures/native-ui/sky";
import { TitleHoldProvider } from "@little-adventures/native-ui/title-hold";
import { colors } from "@little-adventures/native-ui/tokens";
import { QueryClientProvider } from "@tanstack/react-query";
import { DarkTheme, Stack, ThemeProvider, usePathname } from "expo-router";
import {
	hideAsync,
	preventAutoHideAsync,
	setOptions,
} from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { PhoneFrame } from "@/components/phone-frame";
import { AdminHint } from "@/src/admin/admin-hint";
import { AdminPanel } from "@/src/admin/admin-switches";
import { useAdminHold } from "@/src/admin/use-admin-hold";
import { FadeBottom } from "@/src/body-mask";
import { fallbackArt } from "@/src/data/fallback-art";
import { queryClient } from "@/src/data/query-client";
import { useBack } from "@/src/use-back";

preventAutoHideAsync();
// The native splash cross-fades into the first screen (iOS cuts by default; Android already fades).
setOptions({ duration: 400, fade: true });

/** Hides the splash once the start page has chosen the first screen, so it never shows a blank. */
function SplashGate() {
	const pathname = usePathname();
	useEffect(() => {
		if (pathname !== "/") {
			hideAsync();
		}
	}, [pathname]);
	return null;
}

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

	if (!ready) {
		return null;
	}

	return (
		<GestureHandlerRootView style={styles.root}>
			<PhoneFrame>
				<MotionProvider>
					<FallbackArtProvider art={fallbackArt}>
						<BackProvider useBack={useBack}>
							<TitleHoldProvider useHold={useAdminHold}>
								<BodyFadeProvider mask={FadeBottom}>
									<QueryClientProvider client={queryClient}>
										<View style={styles.field}>
											<Sky />
											<ThemeProvider value={clearTheme}>
												<Stack
													screenOptions={{
														// No native cross-fade: like the web preview, the old screen goes at
														// once and the new one's own enter (fade and rise) is the transition.
														animation: "none",
														contentStyle: { backgroundColor: "transparent" },
														headerShown: false,
													}}
												/>
											</ThemeProvider>
											<AdminHint />
											<AdminPanel />
											<SplashGate />
										</View>
									</QueryClientProvider>
								</BodyFadeProvider>
							</TitleHoldProvider>
						</BackProvider>
					</FallbackArtProvider>
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
