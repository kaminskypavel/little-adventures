"use strict";
const path = require("node:path");
const {
	withVarlockMetroConfig,
} = require("@varlock/expo-integration/metro-config");
const { getDefaultConfig } = require("expo/metro-config");
const { withUniwindConfig } = require("uniwind/metro");
const {
	wrapWithReanimatedMetroConfig,
} = require("react-native-reanimated/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// zod re-exports all of its ~60 locales as z.locales, and Metro cannot drop the unused ones
// (about 300 KB). The app only uses English, which zod loads by itself, so the locale index
// resolves to an English-only file.
const ZOD_LOCALES = /[\\/]zod[\\/]v4[\\/]locales[\\/]index\.c?js$/u;
const ENGLISH_ONLY = path.join(__dirname, "src", "zod-locales.js");
config.resolver.resolveRequest = (context, moduleName, platform) => {
	const resolved = context.resolveRequest(context, moduleName, platform);
	return resolved.type === "sourceFile" && ZOD_LOCALES.test(resolved.filePath)
		? { filePath: ENGLISH_ONLY, type: "sourceFile" }
		: resolved;
};

const uniwindConfig = withUniwindConfig(wrapWithReanimatedMetroConfig(config), {
	cssEntryFile: "./global.css",
	dtsFile: "./uniwind-types.d.ts",
});

module.exports = withVarlockMetroConfig(uniwindConfig);
