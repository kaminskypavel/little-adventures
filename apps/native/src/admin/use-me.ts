import { useQuery } from "@tanstack/react-query";
import type { EngineMe } from "@/src/data/engine-client";
import { meOptions } from "@/src/data/engine-queries";

/** The engine's view of this account. Null while loading, in sample mode or on error. */
export function useMe(): EngineMe | null {
	return useQuery(meOptions()).data ?? null;
}
