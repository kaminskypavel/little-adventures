import { type StarTakeName, starFiles } from "./star-source-files";

// HEVC alpha only composites in Safari (WebKit). Chrome on macOS decodes HEVC but drops the
// alpha layer, so test the engine, never canPlayType.
const SAFARI_ENGINE = /^(?:(?!chrome|chromium|android|crios|fxios).)*safari/iu;

const useMov =
	typeof navigator !== "undefined" && SAFARI_ENGINE.test(navigator.userAgent);

/** Web: .mov for Safari only, .webm for every other engine. */
export const starSource = (take: StarTakeName): number =>
	starFiles[take][useMov ? "mov" : "webm"];
