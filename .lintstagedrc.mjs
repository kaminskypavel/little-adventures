// Pre-commit: format and lint staged files; when the landing story or its clips
// change, also run the story tests (well under a second), which check every clip is on the CDN
// and loads in story order. The frame test runs from scripts/upload-story.ts.
export default {
	"*.{js,jsx,mjs,cjs,ts,tsx,mts,cts,json,jsonc,css,scss,less,vue,svelte,astro,html,md,mdx,yaml,yml,graphql,gql}":
		["bunx ultracite fix"],
	"apps/web/{src/components/story/**,scripts/upload-story.ts}": () =>
		"bun test ./apps/web/src/components/story",
};
