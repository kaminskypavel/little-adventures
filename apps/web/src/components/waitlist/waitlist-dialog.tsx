"use client";

import { joinWaitlistInput } from "@little-adventures/api/schemas/waitlist";
import {
	type Ref,
	useActionState,
	useId,
	useImperativeHandle,
	useRef,
} from "react";

import type { Dictionary } from "@/i18n/dictionaries";
import { trpc } from "@/lib/trpc";

import styles from "./waitlist-dialog.module.css";

export type Platform = "ios" | "android";

export interface WaitlistDialogHandle {
	open: (platform: Platform) => void;
}

interface FormState {
	email: string;
	status: "idle" | "invalid" | "error" | "done";
}

async function joinWaitlist(
	_prev: FormState,
	formData: FormData
): Promise<FormState> {
	const raw = formData.get("email");
	const email = typeof raw === "string" ? raw : "";
	const parsed = joinWaitlistInput.safeParse({
		email,
		platform: formData.get("platform"),
	});
	if (!parsed.success) {
		return { email, status: "invalid" };
	}
	try {
		await trpc.waitlist.join.mutate(parsed.data);
		return { email, status: "done" };
	} catch {
		return { email, status: "error" };
	}
}

export function WaitlistDialog({
	copy,
	ref,
}: {
	copy: Dictionary["waitlist"];
	ref: Ref<WaitlistDialogHandle>;
}) {
	const id = useId();
	const dialogRef = useRef<HTMLDialogElement>(null);
	const platformRef = useRef<HTMLInputElement>(null);
	const [state, formAction, isPending] = useActionState<FormState, FormData>(
		joinWaitlist,
		{ email: "", status: "idle" }
	);

	useImperativeHandle(ref, () => ({
		open: (platform) => {
			if (platformRef.current) {
				platformRef.current.value = platform;
			}
			dialogRef.current?.showModal();
		},
	}));

	const close = () => dialogRef.current?.close();

	return (
		// biome-ignore lint/a11y/noNoninteractiveElementInteractions: backdrop click is light dismiss, Escape is native
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
				{state.status === "done" ? (
					<p
						className="text-cream text-[19px] leading-snug font-extrabold"
						role="status"
					>
						{copy.done}
					</p>
				) : (
					<form action={formAction} className="flex flex-col gap-3">
						<input name="platform" ref={platformRef} type="hidden" />
						<label
							className="text-cream text-[19px] font-extrabold"
							htmlFor={`${id}-email`}
						>
							{copy.emailLabel}
						</label>
						<input
							autoComplete="email"
							className="field-well h-18 w-full px-6 text-[22px] font-extrabold"
							defaultValue={state.email}
							id={`${id}-email`}
							inputMode="email"
							name="email"
							placeholder="you@example.com"
							required
							type="email"
						/>
						<p
							aria-live="polite"
							className="text-cream min-h-6 text-[17px] leading-snug font-bold"
						>
							{state.status === "invalid" || state.status === "error"
								? copy[state.status]
								: null}
						</p>
						<button
							aria-busy={isPending}
							className="clay clay-sun rounded-button h-18 w-full cursor-pointer text-[24px] font-black disabled:cursor-wait"
							disabled={isPending}
							type="submit"
						>
							{copy.submit}
						</button>
					</form>
				)}
			</div>
		</dialog>
	);
}
