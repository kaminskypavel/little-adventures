// Minimal typing for the test runner until @types/bun is installed; delete then.
declare module "bun:test" {
	export function describe(name: string, fn: () => void): void;
	export const test: {
		(name: string, fn: () => void): void;
		each: <T extends unknown[]>(
			cases: T[]
		) => (name: string, fn: (...args: T) => void) => void;
	};
	export function expect(value: unknown): {
		toBe: (expected: unknown) => void;
		toEqual: (expected: unknown) => void;
		toContain: (expected: unknown) => void;
		not: { toContain: (expected: unknown) => void };
	};
}
