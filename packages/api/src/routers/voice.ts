import {
	MODELS,
	readWav,
	TRANSCRIBE_COST_MICRO_USD_PER_SECOND,
} from "@little-adventures/transcribe";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { recordAiCall } from "../ai-calls";
import { safetyIdOf } from "../art";
import { protectedProcedure, router } from "../index";

const MAX_SECONDS = 30;

export const voiceRouter = router({
	/** A spoken question (16 kHz mono WAV, up to 30 s) becomes text. */
	transcribe: protectedProcedure
		.input(z.object({ audioBase64: z.string().min(1) }))
		.mutation(async ({ ctx, input }) => {
			const audio = new Uint8Array(Buffer.from(input.audioBase64, "base64"));
			let seconds = 0;
			let invalid: string | null = null;
			try {
				({ seconds } = readWav(audio));
			} catch (error) {
				invalid = error instanceof Error ? error.message : "Bad audio";
			}
			if (invalid) {
				throw new TRPCError({ code: "BAD_REQUEST", message: invalid });
			}
			if (seconds > MAX_SECONDS) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: `Audio is longer than ${MAX_SECONDS} seconds`,
				});
			}
			const ownerId = ctx.principal.user.id;
			const safetyId = await safetyIdOf(ownerId);
			const { text } = await recordAiCall(
				ctx.db,
				{
					costMicroUsd: Math.ceil(
						seconds * TRANSCRIBE_COST_MICRO_USD_PER_SECOND
					),
					model: MODELS.transcribe,
					operation: "voice.transcribe",
					ownerId,
				},
				() => ctx.voice.transcribe({ audio, safetyId })
			);
			return { text };
		}),
});
