import { layout } from "@little-adventures/native-ui/tokens";
import { type ReactNode, useState } from "react";
import { type LayoutChangeEvent, StyleSheet, View } from "react-native";
import {
	SafeAreaFrameContext,
	SafeAreaInsetsContext,
} from "react-native-safe-area-context";

// Debug preview only: the web build shows the app inside a phone, like an iPhone.
const BEZEL = 12;
const DEVICE_RADIUS = 55;
const PAGE_MARGIN = 40;
const backdrop = "#0B0F17";
const bezelColor = "#1A1D24";

// SafeAreaProvider on web re-measures from CSS env() and drops initialMetrics
// (insets 0), so the iPhone metrics are provided through the two contexts.
const frame = {
	height: layout.baseHeight,
	width: layout.baseWidth,
	x: 0,
	y: 0,
};
const insets = { bottom: 34, left: 0, right: 0, top: 47 };

export function PhoneFrame({ children }: { children: ReactNode }) {
	const [scale, setScale] = useState(1);
	const deviceHeight = layout.baseHeight + BEZEL * 2;

	const onLayout = (e: LayoutChangeEvent) => {
		const room = e.nativeEvent.layout.height - PAGE_MARGIN;
		setScale(room < deviceHeight ? Math.max(room, 1) / deviceHeight : 1);
	};

	return (
		<View onLayout={onLayout} style={styles.page}>
			<View style={[styles.device, { transform: [{ scale }] }]}>
				<View nativeID="phone" style={styles.screen}>
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
		height: layout.baseHeight,
		overflow: "hidden",
		width: layout.baseWidth,
	},
});
