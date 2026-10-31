// Pre-commit: format and lint staged files; when the landing story or its clips
// change, also run the story tests (about 2.5 s), which check every file exists
// and every move starts and ends on the frames of the scenes it joins.
export default {
	"*.{js,jsx,mjs,cjs,ts,tsx,mts,cts,json,jsonc,css,scss,less,vue,svelte,astro,html,md,mdx,yaml,yml,graphql,gql}":
		["bunx ultracite fix"],
	"apps/web/{src/components/story/**,public/story/**}": () =>
		"bun test ./apps/web/src/components/story",
};
