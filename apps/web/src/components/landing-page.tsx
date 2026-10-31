import { LanguageMenu } from "@/components/language-menu";
import { VideoStory } from "@/components/story/video-story";
import { dictionaries, type Locale } from "@/i18n/dictionaries";

// The whole page is the story: seven video scenes, the store badges last.
export function LandingPage({ locale }: { locale: Locale }) {
	return (
		<main lang={locale}>
			<VideoStory copy={dictionaries[locale]} />
			<LanguageMenu current={locale} />
		</main>
	);
}
