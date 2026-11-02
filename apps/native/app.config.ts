import type { ConfigContext, ExpoConfig } from "expo/config";

// The web build that www.littleadventures.app serves at /web: a single-page export under that
// base path. Set only by `export:web`, so the dev server and the phone builds are unchanged.
const webBase = process.env.EXPO_WEB_BASE_URL;

export default ({ config }: ConfigContext): ExpoConfig => {
	if (!webBase) {
		return config as ExpoConfig;
	}
	return {
		...config,
		experiments: { ...config.experiments, baseUrl: webBase },
		web: { ...config.web, output: "single" },
	} as ExpoConfig;
};
