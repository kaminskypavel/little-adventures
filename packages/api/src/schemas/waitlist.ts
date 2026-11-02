import { z } from "zod";

export const platformSchema = z.enum(["ios", "android"]);

export const joinWaitlistInput = z.object({
	email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
	platform: platformSchema.optional(),
});

export type JoinWaitlistInput = z.infer<typeof joinWaitlistInput>;
