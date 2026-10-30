import { Platform } from "react-native";
import { type StarTakeName, starFiles } from "./star-source-files";

/** Native: iOS plays the HEVC alpha .mov (AVPlayer composites it), Android the VP9 alpha .webm. */
export const starSource = (take: StarTakeName): number =>
	starFiles[take][Platform.OS === "ios" ? "mov" : "webm"];
