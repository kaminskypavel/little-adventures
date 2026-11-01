import { useEffect, useState } from "react";
import { getMe } from "@/src/data/adventure-client";
import type { EngineMe } from "@/src/data/engine-client";

/** The engine's view of this account, read on mount. Null while loading, in sample mode or on error. */
export function useMe(): EngineMe | null {
	const [me, setMe] = useState<EngineMe | null>(null);
	useEffect(() => {
		let live = true;
		getMe()
			.then((m) => live && setMe(m))
			.catch(() => live && setMe(null));
		return () => {
			live = false;
		};
	}, []);
	return me;
}

/** True only when the engine says so (the sign-in token has no role). False without an engine. */
export const useIsAdmin = () => useMe()?.isAdmin === true;
