import { z } from "zod";

export const CHILD_MIN_AGE = 2;
export const CHILD_MAX_AGE = 11;
const NAME_MAX = 30;

/** The child set up by the grown-up: name, boy or girl, age. All required. */
export const childSchema = z.object({
	age: z
		.number({ error: "Pick an age." })
		.int()
		.min(CHILD_MIN_AGE, "Pick an age.")
		.max(CHILD_MAX_AGE, "Pick an age."),
	kind: z.enum(["boy", "girl"]),
	name: z
		.string()
		.trim()
		.min(1, "Add a name.")
		.max(NAME_MAX, "That name is a little long."),
});

export type Child = z.infer<typeof childSchema>;
