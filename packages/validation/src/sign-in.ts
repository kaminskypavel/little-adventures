import { z } from "zod";

const CODE = /^\d{6}$/u;

/** The grown-up's email for a one-time sign-in code. */
export const emailSchema = z.object({
	email: z
		.string()
		.trim()
		.toLowerCase()
		.pipe(z.email("That email does not look right.")),
});

/** The 6-digit code from the email. */
export const codeSchema = z.object({
	code: z.string().trim().regex(CODE, "The code has 6 digits."),
});

export type EmailForm = z.infer<typeof emailSchema>;
export type CodeForm = z.infer<typeof codeSchema>;
