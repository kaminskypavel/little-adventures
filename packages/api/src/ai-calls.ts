import type { Database } from "@little-adventures/db";
import { aiCalls } from "@little-adventures/db/schema/index";

interface AiCall {
	childId?: string;
	/** Charged when the call succeeds; a failed call costs nothing. */
	costMicroUsd: number;
	model: string;
	operation: string;
	ownerId: string;
}

/** Runs one model call and writes one `ai_calls` row, success or failure. */
export async function recordAiCall<T>(
	db: Database,
	{ childId, costMicroUsd, model, operation, ownerId }: AiCall,
	call: () => Promise<T>
): Promise<T> {
	const began = Date.now();
	let result: T | undefined;
	let failure: unknown;
	try {
		result = await call();
	} catch (error) {
		failure = error;
	}
	const ok = failure === undefined;
	await db.insert(aiCalls).values({
		childId,
		costMicroUsd: ok ? costMicroUsd : 0,
		error: ok ? null : String(failure),
		model,
		ms: Date.now() - began,
		ok,
		operation,
		ownerId,
	});
	if (!ok) {
		throw failure;
	}
	return result as T;
}

const HEX_LENGTH = 32;

/** An opaque, stable id of the grown-up for the model API's abuse checks. */
export async function safetyIdOf(ownerId: string): Promise<string> {
	const digest = await crypto.subtle.digest(
		"SHA-256",
		new TextEncoder().encode(ownerId)
	);
	return Array.from(new Uint8Array(digest), (byte) =>
		byte.toString(16).padStart(2, "0")
	)
		.join("")
		.slice(0, HEX_LENGTH);
}
