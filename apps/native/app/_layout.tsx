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
import { KeyboardProvider } from "react-native-keyboard-controller";
import { PhoneFrame } from "@/components/phone-frame";
import { AdminHint } from "@/src/admin/admin-hint";
import { AdminPanel } from "@/src/admin/admin-switches";
import { useAdminHold } from "@/src/admin/use-admin-hold";
import { useSession } from "@/src/auth/use-session";
import { FadeBottom } from "@/src/body-mask";
import { fallbackArt } from "@/src/data/fallback-art";
import { queryClient } from "@/src/data/query-client";
import { useBack } from "@/src/use-back";

preventAutoHideAsync();
// The splash goes at once and the first screen's own enter (fade and rise) is the transition: a
// cross-fade would show the splash star and the screen's star through each other.
setOptions({ fade: false });

/** Hides the splash once the start page has chosen the first screen, so it never shows a blank. */
function SplashGate() {
	const pathname = usePathname();
	useEffect(() => {
		if (pathname === "/") {
			return;
		}
		// After the screen's first paint, so the splash never gives way to a bare sky.
		const frame = requestAnimationFrame(() =>
			requestAnimationFrame(() => {
				hideAsync();
			})
		);
		return () => cancelAnimationFrame(frame);
	}, [pathname]);
	return null;
}

// Every screen past sign-in needs a signed-in grown-up; signed out, the router falls back to the
// start (index), which sends them to Welcome. Only index, welcome, account and +not-found are open.
const SIGNED_IN_SCREENS = [
	"beta",
	"child",
	"choice",
	"coming",
	"end",
	"gate",
	"grownup-photo",
	"grownups",
	"handover",
	"hello",
	"home",
	"kit",
	"kit-cards",
	"kit-flat",
	"kit-map",
	"kit-select",
	"library",
	"listening",
	"making",
	"map",
	"oops",
	"photo",
	"place",
	"style",
	"verify",
] as const;

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
	// Nothing renders until the session is known, so no screen shows for a moment to a visitor.
	const { status } = useSession();

	if (!ready || status === "loading") {
		return null;
	}

	return (
		<GestureHandlerRootView style={styles.root}>
			<KeyboardProvider>
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
													>
														<Stack.Protected guard={status === "signed-in"}>
															{SIGNED_IN_SCREENS.map((name) => (
																<Stack.Screen key={name} name={name} />
															))}
														</Stack.Protected>
														{/* Signed out only: once signed in they leave the history, so back from
														    Home leaves the app instead of returning to Welcome. */}
														<Stack.Protected guard={status !== "signed-in"}>
															<Stack.Screen name="welcome" />
															<Stack.Screen name="account" />
														</Stack.Protected>
													</Stack>
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
			</KeyboardProvider>
		</GestureHandlerRootView>
	);
}

const styles = StyleSheet.create({
	field: { backgroundColor: colors.fieldNavy, flex: 1 },
	root: { flex: 1 },
});
