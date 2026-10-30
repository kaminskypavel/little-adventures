"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";

const WORDS = ["Little", "Adventures"] as const;

// Cycled over the letters (the space is skipped).
const LETTER_COLORS = [
	"text-sun",
	"text-wm-sky",
	"text-wm-leaf",
	"text-wm-tangerine",
	"text-wm-teal",
	"text-wm-butter",
] as const;

// Fixed tilts in degrees (-5 to 5), one per letter of "LittleAdventures".
const TILTS = [
	-3.5, 2.5, -1.5, 4, -4.5, 1.5, 3, -2, 4.5, -3, 1, -4, 2, -1, 3.5, -2.5,
] as const;

const SHADOW =
	"[text-shadow:0_3px_0_rgba(18,37,74,0.55),0_10px_16px_rgba(0,0,0,0.35)]";
const DEFAULT_SIZE = "text-[length:clamp(46px,9vw,104px)] leading-none";
const HAS_SIZE = /(?:^|\s)text-/u;

const BOB_PX = -3;
const BOB_HALF_CYCLE = 1.8;
const BOB_STAGGER = 0.09;

export function Wordmark({
	as: Tag = "h1",
	className,
}: {
	as?: "h1" | "p";
	className?: string;
}) {
	const root = useRef<HTMLHeadingElement>(null);

	useGSAP(
		() => {
			const mm = gsap.matchMedia();
			mm.add("(prefers-reduced-motion: no-preference)", () => {
				gsap.to("[data-letter]", {
					duration: BOB_HALF_CYCLE,
					ease: "sine.inOut",
					// Each letter loops on its own, offset by the stagger, so the wave never pauses.
					stagger: { each: BOB_STAGGER, repeat: -1, yoyo: true },
					y: BOB_PX,
				});
			});
			return () => mm.revert();
		},
		{ scope: root }
	);

	const size = className && HAS_SIZE.test(className) ? "" : DEFAULT_SIZE;

	return (
		<Tag
			aria-label="Little Adventures"
			className={`font-brand font-black ${SHADOW} ${size} ${className ?? ""}`}
			ref={root}
		>
			{WORDS.map((word, w) => (
				<span key={word}>
					<span className="inline-block whitespace-nowrap">
						{Array.from(word, (letter, n) => {
							const i = WORDS.slice(0, w).join("").length + n;
							return (
								<span
									aria-hidden="true"
									className={`inline-block ${LETTER_COLORS[i % LETTER_COLORS.length]}`}
									data-letter
									key={`${word}-${i}`}
									style={{ rotate: `${TILTS[i]}deg` }}
								>
									{letter}
								</span>
							);
						})}
					</span>
					{w < WORDS.length - 1 ? " " : null}
				</span>
			))}
		</Tag>
	);
}
