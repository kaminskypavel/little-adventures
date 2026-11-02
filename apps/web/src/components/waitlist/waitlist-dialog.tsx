"use client";

import { type Ref, useId, useImperativeHandle, useRef } from "react";

import type { Dictionary } from "@/i18n/dictionaries";

import styles from "./waitlist-dialog.module.css";
import { type Share, WaitlistForm } from "./waitlist-form";

export interface WaitlistDialogHandle {
	open: () => void;
}

export function WaitlistDialog({
	copy,
	ref,
	share,
}: {
	copy: Dictionary["waitlist"];
	ref: Ref<WaitlistDialogHandle>;
	share: Share;
}) {
	const id = useId();
	const dialogRef = useRef<HTMLDialogElement>(null);

	useImperativeHandle(ref, () => ({
		open: () => dialogRef.current?.showModal(),
	}));

	const close = () => dialogRef.current?.close();

	return (
		// biome-ignore lint/a11y/useKeyWithClickEvents: backdrop click is light dismiss, Escape is native
		<dialog
			aria-labelledby={`${id}-title`}
			className={styles.dialog}
			onClick={(event) => {
				if (event.target === event.currentTarget) {
					close();
				}
			}}
			ref={dialogRef}
		>
			<div className="relative flex flex-col gap-4 p-7">
				<button
					aria-label={copy.close}
					className="clay clay-sage absolute top-7 right-7 grid size-14 cursor-pointer place-items-center rounded-full"
					onClick={close}
					type="button"
				>
					<svg
						aria-hidden="true"
						className="stroke-ink-navy"
						fill="none"
						height="24"
						strokeLinecap="round"
						strokeWidth="2.4"
						viewBox="0 0 24 24"
						width="24"
					>
						<path d="M6 6l12 12M18 6L6 18" />
					</svg>
				</button>
				<h2
					className="text-cream flex min-h-14 items-center pr-16 text-[30px] leading-[1.08] font-black"
					id={`${id}-title`}
				>
					{copy.title}
				</h2>
				<p className="text-cream/85 text-[19px] leading-snug font-bold">
					{copy.body}
				</p>
				<WaitlistForm copy={copy} labelled share={share} />
			</div>
		</dialog>
	);
}
