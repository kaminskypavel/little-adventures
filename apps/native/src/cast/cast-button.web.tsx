import { ClayPressable } from "@little-adventures/native-ui/clay-pressable";
import {
	colors,
	iconSizes,
	layout,
	radii,
} from "@little-adventures/native-ui/tokens";
import { CastIcon } from "./cast-icon";
import { pickTv, useCastAvailable } from "./use-cast.web";

/** The Cast button, shown only when Chrome can cast and a TV is on the network. */
export function CastButton() {
	if (!useCastAvailable()) {
		return null;
	}
	return (
		<ClayPressable
			accessibilityLabel="Play on the TV"
			onPress={pickTv}
			radius={radii.full}
			style={{
				alignItems: "center",
				height: layout.minTarget,
				justifyContent: "center",
				width: layout.minTarget,
			}}
			testID="cast-button"
			tone="sage"
		>
			<CastIcon color={colors.inkNavy} size={iconSizes.button} />
		</ClayPressable>
	);
}
