"use client";

import Image from "next/image";
import { useRef } from "react";

import { WaitlistDialog, type WaitlistDialogHandle } from "./waitlist-dialog";

const BADGE_HEIGHT = 52;

export function StoreBadges({ className = "" }: { className?: string }) {
	const dialog = useRef<WaitlistDialogHandle>(null);

	return (
		<div className={`flex flex-col items-center gap-4 ${className}`}>
			<div className="flex flex-wrap items-center justify-center gap-4">
				<button
					className="cursor-pointer"
					onClick={() => dialog.current?.open("ios")}
					type="button"
				>
					<Image
						alt="Download on the App Store"
						height={BADGE_HEIGHT}
						src="/badges/app-store.svg"
						width={156}
					/>
					<span className="sr-only"> (join the waitlist)</span>
				</button>
				<button
					className="cursor-pointer"
					onClick={() => dialog.current?.open("android")}
					type="button"
				>
					<Image
						alt="Get it on Google Play"
						height={BADGE_HEIGHT}
						src="/badges/google-play.png"
						width={175}
					/>
					<span className="sr-only"> (join the waitlist)</span>
				</button>
			</div>
			<p className="text-cream/80 text-center text-[17px] font-bold">
				Coming soon to iPhone and Android.
			</p>
			<WaitlistDialog ref={dialog} />
		</div>
	);
}
