"use client";

import { joinWaitlistInput } from "@little-adventures/api/schemas/waitlist";
import { useActionState, useId } from "react";

import type { Dictionary } from "@/i18n/dictionaries";
import { trpc } from "@/lib/trpc";

/** What a parent shares after joining: the page's title and its address. */
export interface Share {
	text: string;
	url: string;
}

interface FormState {
	email: string;
	status: "idle" | "invalid" | "error" | "done";
}

// The email is all we ask for.
async function joinWaitlist(
	_prev: FormState,
	formData: FormData
): Promise<FormState> {
	const raw = formData.get("email");
	const email = typeof raw === "string" ? raw : "";
	const parsed = joinWaitlistInput.safeParse({ email });
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

const BUTTON =
	"rounded-button flex h-16 cursor-pointer items-center justify-center px-6 text-[21px] font-black max-[899px]:h-14 max-[899px]:text-[19px]";

// After joining: thanks, then one tap to tell another parent.
function Joined({
	copy,
	share,
}: {
	copy: Dictionary["waitlist"];
	share: Share;
}) {
	const [copied, copyLink] = useActionState(async () => {
		try {
			await navigator.clipboard.writeText(share.url);
			return true;
		} catch {
			return false;
		}
	}, false);
	const post = `https://x.com/intent/post?${new URLSearchParams({ text: share.text, url: share.url })}`;

	return (
		<div className="flex flex-col gap-3" role="status">
			<p className="text-cream text-[19px] leading-snug font-extrabold">
				{copy.done}
			</p>
			<p className="text-cream/85 text-[17px] leading-snug font-bold">
				{copy.share.prompt}
			</p>
			<div className="grid grid-cols-2 gap-3 max-[420px]:grid-cols-1">
				<a
					className={`${BUTTON} bg-black text-white shadow-[inset_0_0_0_1.5px_rgba(244,236,216,0.28),0_11px_17px_-8px_rgba(0,0,0,0.55)]`}
					href={post}
					rel="noopener noreferrer"
					target="_blank"
				>
					{copy.share.x}
				</a>
				<form action={copyLink} className="flex">
					<button className={`clay clay-sage ${BUTTON} flex-1`} type="submit">
						{copied ? copy.share.copied : copy.share.copy}
					</button>
				</form>
			</div>
		</div>
	);
}

// One form for the dialog and for the last scene; `labelled` shows the field's label.
export function WaitlistForm({
	copy,
	labelled = false,
	share,
}: {
	copy: Dictionary["waitlist"];
	labelled?: boolean;
	share: Share;
}) {
	const id = useId();
	const [state, formAction, isPending] = useActionState<FormState, FormData>(
		joinWaitlist,
		{ email: "", status: "idle" }
	);

	if (state.status === "done") {
		return <Joined copy={copy} share={share} />;
	}
	return (
		<form action={formAction} className="flex flex-col gap-3">
			<label
				className={
					labelled ? "text-cream text-[19px] font-extrabold" : "sr-only"
				}
				htmlFor={`${id}-email`}
			>
				{copy.emailLabel}
			</label>
			<input
				autoComplete="email"
				className="field-well h-16 w-full px-6 text-[21px] font-extrabold max-[899px]:h-14 max-[899px]:text-[19px]"
				defaultValue={state.email}
				id={`${id}-email`}
				inputMode="email"
				name="email"
				placeholder="you@example.com"
				required
				type="email"
			/>
			{state.status === "invalid" || state.status === "error" ? (
				<p
					aria-live="polite"
					className="text-cream text-[17px] leading-snug font-bold"
				>
					{copy[state.status]}
				</p>
			) : null}
			<button
				aria-busy={isPending}
				className={`clay clay-sun ${BUTTON} w-full disabled:cursor-wait`}
				disabled={isPending}
				type="submit"
			>
				{copy.submit}
			</button>
		</form>
	);
}
