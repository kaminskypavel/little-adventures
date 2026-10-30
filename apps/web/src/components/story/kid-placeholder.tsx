// Placeholder until the approved characters exist. A flat silhouette that
// faces the phone: the right-hand kid is the left-hand one mirrored.
export function KidPlaceholder({
	side,
	className,
}: {
	side: "left" | "right";
	className?: string;
}) {
	return (
		<div aria-hidden="true" className={className} data-kid={side}>
			<svg
				aria-hidden="true"
				className="size-full"
				fill="none"
				preserveAspectRatio="xMidYMax meet"
				viewBox="0 0 200 330"
			>
				<g transform={side === "right" ? "translate(200 0) scale(-1 1)" : ""}>
					<path
						className="fill-deep-navy"
						d="M20 330V192a80 80 0 0 1 160 0V330Z"
					/>
					<circle
						className="fill-sage-lo"
						cx="104"
						cy="74"
						opacity="0.9"
						r="46"
					/>
					<circle
						className="fill-sage-lo"
						cx="152"
						cy="82"
						opacity="0.9"
						r="9"
					/>
				</g>
			</svg>
		</div>
	);
}
