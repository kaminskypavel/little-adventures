import { layout } from "@little-adventures/native-ui/tokens";
import { usePathname } from "expo-router";
import { type ReactNode, useState } from "react";
import { type LayoutChangeEvent, StyleSheet, View } from "react-native";
import {
	SafeAreaFrameContext,
	SafeAreaInsetsContext,
} from "react-native-safe-area-context";
import { isAdventurePath, useLandscape } from "@/src/orientation";

// Debug preview only: the web build shows the app inside a phone, like an iPhone.
const BEZEL = 12;
const DEVICE_RADIUS = 55;
const PAGE_MARGIN = 40;
const backdrop = "#0B0F17";
const bezelColor = "#1A1D24";

// SafeAreaProvider on web re-measures from CSS env() and drops initialMetrics
// (insets 0), so the iPhone metrics are provided through the two contexts.
const portrait = {
	frame: { height: layout.baseHeight, width: layout.baseWidth, x: 0, y: 0 },
	insets: { bottom: 34, left: 0, right: 0, top: 47 },
};
// The adventure screens in a landscape window: the same phone on its side, notch to the left.
const landscape = {
	frame: { height: layout.baseWidth, width: layout.baseHeight, x: 0, y: 0 },
	insets: { bottom: 21, left: 47, right: 47, top: 0 },
};

export function PhoneFrame({ children }: { children: ReactNode }) {
	const [room, setRoom] = useState({ height: 0, width: 0 });
	const landscapeWindow = useLandscape();
	const pathname = usePathname();
	const sideways = landscapeWindow && isAdventurePath(pathname);
	const { frame, insets } = sideways ? landscape : portrait;
	const deviceHeight = frame.height + BEZEL * 2;
	const deviceWidth = frame.width + BEZEL * 2;
	const fit = (space: number, size: number) =>
		space - PAGE_MARGIN < size ? Math.max(space - PAGE_MARGIN, 1) / size : 1;
	const scale = Math.min(
		fit(room.height, deviceHeight),
		fit(room.width, deviceWidth)
	);

	const onLayout = (e: LayoutChangeEvent) => {
		const { height, width } = e.nativeEvent.layout;
		setRoom({ height, width });
	};

	return (
		<View onLayout={onLayout} style={styles.page}>
			<View style={[styles.device, { transform: [{ scale }] }]}>
				<View
					nativeID="phone"
					style={[styles.screen, { height: frame.height, width: frame.width }]}
				>
					<SafeAreaFrameContext.Provider value={frame}>
						<SafeAreaInsetsContext.Provider value={insets}>
							{children}
						</SafeAreaInsetsContext.Provider>
					</SafeAreaFrameContext.Provider>
				</View>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	device: {
		backgroundColor: bezelColor,
		borderRadius: DEVICE_RADIUS,
		boxShadow: "0px 30px 80px 0px rgba(0,0,0,0.6)",
		padding: BEZEL,
	},
	page: {
		alignItems: "center",
		backgroundColor: backdrop,
		flex: 1,
		justifyContent: "center",
		overflow: "hidden",
	},
	screen: {
		borderRadius: DEVICE_RADIUS - BEZEL,
		overflow: "hidden",
	},
});
