import { StyleSheet } from "react-native";
import { CastButton } from "react-native-google-cast";

/**
 * The tap area of a menu row that plays on the TV, on iOS and Android: the system's own Cast
 * control, invisible, over the whole row, so a tap finds TVs and opens the system's TV list
 * exactly as the round Cast button does. tv-hit.web.tsx does the same for Chrome.
 */
export function TvHit() {
	return (
		<CastButton
			accessibilityLabel="Play on the TV"
			style={StyleSheet.absoluteFill}
			tintColor="transparent"
		/>
	);
}
