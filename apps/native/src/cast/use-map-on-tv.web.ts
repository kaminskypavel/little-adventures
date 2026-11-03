// Web: the map is not sent to the TV (the user's call, 2026-11-03). Same hook as use-map-on-tv.ts.
import { type RefObject, useRef } from "react";
import type { View } from "react-native";

export function useMapOnTv(_options: {
	adventureId: string;
	ready: boolean;
	title: string;
	version: string;
}): RefObject<View | null> {
	return useRef<View>(null);
}
