"use client";

import { useRef } from "react";

import type { Dictionary } from "@/i18n/dictionaries";
import { WaitlistDialog, type WaitlistDialogHandle } from "./waitlist-dialog";
import type { Share } from "./waitlist-form";

// The way in from every scene: a sun button in the bottom-left corner, on the same
// edge as the language menu, so on very wide screens it stays inside the 16:9 frame.
// The story shows it once loaded and hides it on the last scene, where the form is.
export function EarlyAccess({
	copy,
	share,
}: {
	copy: Dictionary["waitlist"];
	share: Share;
}) {
	const dialog = useRef<WaitlistDialogHandle | null>(null);

	return (
		<>
			<button
				className="clay clay-sun invisible fixed bottom-[max(16px,2.2vw)] left-[max(16px,2.2vw)] z-[6] h-14 cursor-pointer rounded-full px-7 text-[19px] font-black max-[899px]:bottom-[max(14px,env(safe-area-inset-bottom))] max-[899px]:left-2.5 max-[899px]:h-12 max-[899px]:px-5 max-[899px]:text-[17px] [@media(min-aspect-ratio:16/9)]:left-[calc((100vw-177.78vh)/2+2vw)]"
				data-early
				onClick={() => dialog.current?.open()}
				type="button"
			>
				{copy.open}
			</button>
			<WaitlistDialog copy={copy} ref={dialog} share={share} />
		</>
	);
}
