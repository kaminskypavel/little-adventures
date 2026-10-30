const POINTS = [
	"Made for ages 2 to 11, with you sitting beside them.",
	"Settings sit behind a 3-second hold, out of little hands.",
	"Edit, redraw or delete your child's picture at any time.",
	"No streaks, badges or timers. Just a calm story at the end of the day.",
];

export function GrownUps() {
	return (
		<section
			aria-labelledby="grown-ups-title"
			className="px-[22px] py-16 md:py-24"
			id="grown-ups"
		>
			<h2
				className="text-cream text-center text-[clamp(32px,4.4vw,52px)] leading-[1.08] font-black"
				id="grown-ups-title"
			>
				For the grown-up beside them
			</h2>
			<ul className="rounded-card bg-sand text-ink-navy mx-auto mt-10 flex max-w-[640px] flex-col gap-4 p-[25px]">
				{POINTS.map((point) => (
					<li
						className="flex items-start gap-3 text-[20px] leading-[1.3] font-extrabold"
						key={point}
					>
						<span
							aria-hidden="true"
							className="bg-sun mt-[7px] size-3 shrink-0 rounded-full"
						/>
						{point}
					</li>
				))}
			</ul>
		</section>
	);
}
