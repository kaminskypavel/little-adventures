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
