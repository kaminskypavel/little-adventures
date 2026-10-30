// biome-ignore-all lint/suspicious/noBitwiseOperators: mulberry32 is 32-bit integer math
/** Small seeded random (mulberry32): same seed, same sequence, every run. */
export function mulberry32(seed: number): () => number {
	let a = seed;
	return () => {
		a = (a + 0x6d_2b_79_f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
		return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
	};
}
