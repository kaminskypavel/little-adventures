import { Sky } from "@/components/sky";
import { StorySlides } from "@/components/story/story-slides";

// The whole page is the slides: hero first, closing badges last.
export default function LandingPage() {
	return (
		<>
			<Sky />
			<main>
				<StorySlides />
			</main>
		</>
	);
}
