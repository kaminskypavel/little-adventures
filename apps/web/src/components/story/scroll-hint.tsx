"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";

const BOB_PX = 5;
const BOB_HALF_CYCLE = 0.9;

// Shown on the first slide only. The story hides it after the first move and
// wires its click to "next". A plain button: it is the one tappable thing
// here, so it is the one raised pill.
export function ScrollHint() {
	const chevron = useRef<SVGSVGElement>(null);

	useGSAP(
		() => {
			const mm = gsap.matchMedia();
			mm.add("(prefers-reduced-motion: no-preference)", () => {
				gsap.to(chevron.current, {
					duration: BOB_HALF_CYCLE,
					ease: "sine.inOut",
					repeat: -1,
					y: BOB_PX,
					yoyo: true,
				});
			});
			return () => mm.revert();
		},
		{ scope: chevron }
	);

	return (
		<button
			aria-label="Next"
			className="clay clay-sage fixed bottom-[calc(env(safe-area-inset-bottom)+20px)] left-1/2 z-30 inline-flex h-12 -translate-x-1/2 cursor-pointer items-center gap-2 rounded-[24px] px-5 text-[17px] font-extrabold motion-reduce:hidden min-[900px]:bottom-10 min-[900px]:left-[clamp(32px,6vw,104px)] min-[900px]:translate-x-0"
			data-scroll-hint
			type="button"
		>
			<span className="inline [@media(hover:none)]:hidden">Scroll</span>
			<span className="hidden [@media(hover:none)]:inline">Swipe up</span>
			<svg
				aria-hidden="true"
				className="size-6"
				fill="none"
				ref={chevron}
				stroke="currentColor"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth={2.4}
				viewBox="0 0 24 24"
			>
				<path d="M6 9l6 6 6-6" />
			</svg>
		</button>
	);
}
