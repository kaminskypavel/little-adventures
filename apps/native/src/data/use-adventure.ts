import { useCallback, useEffect, useState } from "react";
import {
	getAdventure,
	getProgress,
	visit as visitNode,
} from "./adventure-client";
import type { Adventure, NodeId, Progress } from "./types";

export function useAdventure(id: string) {
	const [adventure, setAdventure] = useState<Adventure | null>(null);
	const [progress, setProgress] = useState<Progress | null>(null);

	useEffect(() => {
		let live = true;
		getAdventure(id).then((a) => live && setAdventure(a));
		getProgress(id).then((p) => live && setProgress(p));
		return () => {
			live = false;
		};
	}, [id]);

	const visit = useCallback(
		async (node: NodeId) => {
			const p = await visitNode(id, node);
			setProgress(p);
			return p;
		},
		[id]
	);

	return { adventure, progress, visit };
}
