"use client";

import Image from "next/image";
import { useRef } from "react";

import type { Dictionary } from "@/i18n/dictionaries";
import { WaitlistDialog, type WaitlistDialogHandle } from "./waitlist-dialog";

const BADGE_HEIGHT = 52;

// "start" aligns to the start only from the 900px split up. Below it the
// stacked layout is centred, so the row and the line stay centred there too.
const ALIGN = {
	center: {
		column: "items-center",
		line: "text-center",
		row: "justify-center",
	},
	start: {
		column: "items-center min-[900px]:items-start",
		line: "text-center min-[900px]:text-left",
		row: "justify-center min-[900px]:justify-start",
	},
} as const;

export function StoreBadges({
	align = "center",
	className = "",
	copy,
}: {
	align?: "center" | "start";
	className?: string;
	copy: Dictionary;
}) {
	const dialog = useRef<WaitlistDialogHandle>(null);
	const place = ALIGN[align];

	return (
		<div className={`flex flex-col gap-4 ${place.column} ${className}`}>
			<div
				className={`flex flex-wrap items-center gap-3 min-[900px]:gap-4 ${place.row}`}
			>
				<button
					className="cursor-pointer"
					onClick={() => dialog.current?.open("ios")}
					type="button"
				>
					<Image
						alt={copy.badges.appStore}
						height={BADGE_HEIGHT}
						src="/badges/app-store.svg"
						width={156}
					/>
					<span className="sr-only"> {copy.badges.joinWaitlist}</span>
				</button>
				<button
					className="cursor-pointer"
					onClick={() => dialog.current?.open("android")}
					type="button"
				>
					<Image
						alt={copy.badges.googlePlay}
						height={BADGE_HEIGHT}
						src="/badges/google-play.png"
						width={175}
					/>
					<span className="sr-only"> {copy.badges.joinWaitlist}</span>
				</button>
			</div>
			<p className={`text-cream/80 text-[17px] font-bold ${place.line}`}>
				{copy.badges.comingSoon}
			</p>
			<WaitlistDialog copy={copy.waitlist} ref={dialog} />
		</div>
	);
}
