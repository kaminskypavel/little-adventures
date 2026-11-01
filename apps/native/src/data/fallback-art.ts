import type { FallbackArt } from "@little-adventures/native-ui/fallback-image";

// Generic stand-ins from the bundled sample adventure, shown when a picture is missing or fails to load.
export const fallbackArt: FallbackArt = {
	goalClosed: require("../../assets/story/moon-gate.png"),
	goalOpen: require("../../assets/story/moon-open.png"),
	place: require("../../assets/story/places/glow-flowers.jpg"),
};
