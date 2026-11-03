import { Pressable, StyleSheet } from "react-native";
import { pickTv } from "./use-cast.web";

/** The tap area of a menu row that plays on the TV, in Chrome: it opens Chrome's "Cast to" list. */
export function TvHit() {
	return (
		<Pressable
			accessibilityLabel="Play on the TV"
			accessibilityRole="button"
			onPress={pickTv}
			style={StyleSheet.absoluteFill}
		/>
	);
}
