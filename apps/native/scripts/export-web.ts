// Exports the app for the web at /web into dist-web, for the landing site to serve
// (apps/web copies it into public/web before its build). The server and engine urls come
// from EXPO_PUBLIC_SERVER_URL and EXPO_PUBLIC_ENGINE_URL.
//
// Assets that Metro takes from node_modules land under assets/__node_modules/.bun/...; a
// deploy skips folders named node_modules and dot folders, so those paths are moved to
// assets/vendor/... and the bundles' references are rewritten to match.
import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	renameSync,
	rmSync,
	statSync,
	writeFileSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";
import { spawnSync } from "bun";

const OUT = "dist-web";
const BASE = "/web";
const HIDDEN = "__node_modules/.bun/";
const HIDDEN_PATH = /__node_modules\/\.bun\/[^"' ]+/gu;

const visible = (path: string) =>
	path.replace(HIDDEN, "vendor/").replaceAll("/node_modules/", "/m/");

function filesUnder(dir: string): string[] {
	return readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		return statSync(path).isDirectory() ? filesUnder(path) : [path];
	});
}

rmSync(OUT, { force: true, recursive: true });
const run = spawnSync(
	["bunx", "expo", "export", "-p", "web", "--output-dir", OUT, "--clear"],
	{
		env: { ...process.env, EXPO_WEB_BASE_URL: BASE },
		stderr: "inherit",
		stdout: "inherit",
	}
);
if (!run.success) {
	throw new Error("expo export failed");
}

const hiddenRoot = join(OUT, "assets/__node_modules");
if (existsSync(hiddenRoot)) {
	for (const file of filesUnder(hiddenRoot)) {
		const target = join(OUT, visible(relative(OUT, file)));
		mkdirSync(dirname(target), { recursive: true });
		renameSync(file, target);
	}
	rmSync(hiddenRoot, { force: true, recursive: true });
}
const bundles = join(OUT, "_expo/static/js/web");
for (const name of readdirSync(bundles)) {
	const path = join(bundles, name);
	const code = readFileSync(path, "utf8");
	const moved = code.replace(HIDDEN_PATH, visible);
	if (moved !== code) {
		writeFileSync(path, moved);
	}
}
const left = filesUnder(OUT).filter(
	(path) => path.includes("/.bun/") || path.includes("/node_modules/")
);
if (left.length > 0) {
	throw new Error(
		`asset paths a deploy would skip: ${left.slice(0, 3).join(", ")}`
	);
}
console.log(`web app exported to ${OUT} for ${BASE}`);
