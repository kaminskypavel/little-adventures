// Uploads the landing story clips to the CDN bucket and records their names in
// src/components/story/story-media.json, which the story tests check against.
// Usage: CLOUDFLARE_ACCOUNT_ID=<account> bun scripts/upload-story.ts <folder with the clips>
// (needs `wrangler login`; the account id picks the account when the login sees several)
// Before uploading it runs the frame test on that folder: every move must start
// and end on the frames of the scenes it joins.
import { readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawn, spawnSync } from "bun";

const BUCKET = "little-adventures";
// A changed set of clips goes to a new version folder: the CDN keeps files for a year.
const PREFIX = "landing/story/v3";
const CACHE = "public, max-age=31536000, immutable";
const PARALLEL = 6;
const TYPES: Record<string, string> = { mp4: "video/mp4", webp: "image/webp" };

const dir = resolve(process.argv[2] ?? "");
const files = readdirSync(dir)
	.filter((f) => (f.split(".").pop() ?? "") in TYPES)
	.sort();
if (files.length === 0) {
	throw new Error(`No clips found in ${dir}`);
}

const check = spawnSync(
	["bun", "test", "./src/components/story/story-frames.test.ts"],
	{
		env: { ...process.env, STORY_MEDIA_DIR: dir },
		stderr: "inherit",
		stdout: "inherit",
	}
);
if (!check.success) {
	throw new Error("The frame test failed; nothing was uploaded.");
}

const put = async (file: string) => {
	const type = TYPES[file.split(".").pop() ?? ""];
	const proc = spawn(
		[
			"bunx",
			"wrangler",
			"r2",
			"object",
			"put",
			`${BUCKET}/${PREFIX}/${file}`,
			"--file",
			join(dir, file),
			"--content-type",
			type,
			"--cache-control",
			CACHE,
			"--remote",
		],
		{ stderr: "pipe", stdout: "ignore" }
	);
	if ((await proc.exited) !== 0) {
		throw new Error(
			`Upload failed: ${file}\n${await new Response(proc.stderr).text()}`
		);
	}
	console.log(`uploaded ${file}`);
};
for (let i = 0; i < files.length; i += PARALLEL) {
	// biome-ignore lint/performance/noAwaitInLoops: a few uploads at a time, not all at once.
	await Promise.all(files.slice(i, i + PARALLEL).map(put));
}

writeFileSync(
	join(import.meta.dir, "../src/components/story/story-media.json"),
	`${JSON.stringify({ base: `${PREFIX}`, files }, null, "\t")}\n`
);
console.log(`${files.length} files in ${BUCKET}/${PREFIX}`);
