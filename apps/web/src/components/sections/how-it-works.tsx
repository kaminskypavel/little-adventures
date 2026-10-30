import Image from "next/image";

const STEPS = [
	{
		alt: "Glittering swirls rising over a moon",
		line: "Your child asks any question with one tap on the mic. No typing.",
		picture: "moon-dust",
		title: "Ask out loud",
	},
	{
		alt: "Earth rising over the moon",
		line: "The question becomes a map of four places, with your child as the hero.",
		picture: "earth-rise",
		title: "An adventure starring your child",
	},
	{
		alt: "A blue whale singing music notes",
		line: "Each place is a short narrated story that ends on a choice.",
		picture: "whale-songs",
		title: "Your child picks the way",
	},
	{
		alt: "Glowing blue flowers among moon rocks",
		line: "After all four places, goodnight recaps what your child found out.",
		picture: "glow-flowers",
		title: "Always ends in goodnight",
	},
] as const;

export function HowItWorks() {
	return (
		<section
			aria-labelledby="how-title"
			className="px-[22px] py-16 md:py-24"
			id="how"
		>
			<h2
				className="text-cream text-center text-[clamp(32px,4.4vw,52px)] leading-[1.08] font-black"
				id="how-title"
			>
				How an adventure goes
			</h2>
			<ol className="mx-auto mt-10 grid max-w-[1040px] grid-cols-1 gap-[14px] md:grid-cols-2">
				{STEPS.map((step) => (
					<li
						className="rounded-card bg-plate-dark flex items-center gap-4 p-[11px]"
						key={step.picture}
					>
						<div className="relative aspect-video w-[150px] shrink-0 overflow-hidden rounded-[25px] md:w-[180px]">
							<Image
								alt={step.alt}
								className="object-cover"
								fill
								sizes="(min-width: 768px) 180px, 150px"
								src={`/places/${step.picture}.jpg`}
							/>
						</div>
						<div className="min-w-0">
							<h3 className="text-cream text-[24px] leading-tight font-black">
								{step.title}
							</h3>
							<p className="text-cream/85 mt-1 text-[19px] leading-[1.3] font-bold">
								{step.line}
							</p>
						</div>
					</li>
				))}
			</ol>
		</section>
	);
}
