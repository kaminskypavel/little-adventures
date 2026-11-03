import { layout } from "@little-adventures/native-ui/tokens";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CastButton } from "./cast-button";

// The map's own top corners (see ForkMap): the stage it draws is 852 x 393 and scaled to fit; its
// Grown-ups button sits 55 from the right, 14 from the top.
const STAGE = { height: 393, width: 852 };
const LOCK_RIGHT = 55;
const LOCK_TOP = 14;

/**
 * The Cast button on the map, in the top corner with the Grown-ups lock, just inside it, the same
 * button as in the place player. It floats over the map and is not part of the map's picture.
 */
export function MapCastButton({ sideways }: { sideways: boolean }) {
	const insets = useSafeAreaInsets();
	const window = useWindowDimensions();
	const beside = layout.minTarget + layout.gap;
	if (!sideways) {
		return (
			<View
				pointerEvents="box-none"
				style={[
					styles.row,
					{
						marginTop: insets.top + layout.topBarOffset,
						right: insets.right + layout.sideMargin + beside,
					},
				]}
			>
				<CastButton />
			</View>
		);
	}
	// Sideways, the lock lives on the scaled stage, so the button goes on the same stage.
	const scale = Math.min(
		window.width / STAGE.width,
		window.height / STAGE.height
	);
	return (
		<View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
			<View
				pointerEvents="box-none"
				style={{
					height: STAGE.height,
					left: (window.width - STAGE.width) / 2,
					position: "absolute",
					top: (window.height - STAGE.height) / 2,
					transform: [{ scale }],
					width: STAGE.width,
				}}
			>
				<View
					style={{
						position: "absolute",
						right: LOCK_RIGHT + beside,
						top: LOCK_TOP,
					}}
				>
					<CastButton />
				</View>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	row: {
		alignItems: "center",
		height: layout.topBarHeight,
		position: "absolute",
	},
});
