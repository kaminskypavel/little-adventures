import { Sky } from "@/components/sky";
import { StoryStage } from "@/components/story/story-stage";

// The whole page is the pinned story: hero first, closing badges last.
export default function LandingPage() {
	return (
		<>
			<Sky />
			<main>
				<StoryStage />
			</main>
		</>
	);
}
