import { StoreBadges } from "@/components/waitlist/store-badges";

export function Closing() {
	return (
		<section
			aria-labelledby="get-title"
			className="px-[22px] py-16 md:py-24"
			id="get"
		>
			<h2
				className="text-cream mx-auto max-w-[16ch] text-center text-[clamp(32px,4.4vw,52px)] leading-[1.08] font-black"
				id="get-title"
			>
				Your child's next question is an adventure.
			</h2>
			<div className="mt-10">
				<StoreBadges />
			</div>
		</section>
	);
}
