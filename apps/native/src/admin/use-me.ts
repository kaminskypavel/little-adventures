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
