import { Closing } from "@/components/sections/closing";
import { GrownUps } from "@/components/sections/grown-ups";
import { HowItWorks } from "@/components/sections/how-it-works";
import { SiteFooter } from "@/components/sections/site-footer";
import { Sky } from "@/components/sky";
import { StoreBadges } from "@/components/waitlist/store-badges";
import { Wordmark } from "@/components/wordmark";

export default function LandingPage() {
	return (
		<>
			<Sky />
			<main>
				<section className="flex min-h-svh flex-col items-center justify-center gap-6 px-[22px] text-center">
					<Wordmark />
					<p className="max-w-[22ch] text-[clamp(22px,2.6vw,32px)] leading-tight font-extrabold">
						Stories that start with your child's curiosity.
					</p>
					<p className="text-cream/85 max-w-[34ch] text-[clamp(17px,1.6vw,20px)] leading-snug">
						Your child asks out loud. An adventure grows from the question,
						starring your child, and it always ends in goodnight.
					</p>
					<StoreBadges className="mt-4" />
				</section>
				<HowItWorks />
				<GrownUps />
				<Closing />
			</main>
			<SiteFooter />
		</>
	);
}
