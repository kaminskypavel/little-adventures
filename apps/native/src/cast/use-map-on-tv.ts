// Native only. use-map-on-tv.web.ts is the same hook doing nothing.
import { type RefObject, useEffect, useRef } from "react";
import type { View } from "react-native";
import { castMap } from "@/src/data/adventure-client";
import { useCastConnected, useTvImage } from "./use-cast";

// Let the map's pictures load and its stars settle before it is photographed.
const SETTLE_MS = 1500;
const JPEG_QUALITY = 0.8;
const IMAGE_TYPE = "image/jpeg";

/**
 * The captured picture's bytes, or null when what was read is not an image. iOS gives a bare
 * path: without the scheme fetch resolves it against the bundle's server and reads a web page.
 */
async function readPicture(uri: string): Promise<Blob | null> {
	const fileUri = uri.startsWith("file://") ? uri : `file://${uri}`;
	const bytes = await (await fetch(fileUri)).blob();
	return bytes.type && !bytes.type.startsWith("image/") ? null : bytes;
}

/**
 * While a TV is connected, photographs the map once it has drawn and shows that picture on the
 * TV. Photographs again when `version` changes (a place was visited or finished drawing). It runs
 * after the map is shown and ignores every error: the TV keeps what it had.
 *
 * Attach the returned ref to a View with `collapsable={false}` that wraps the map.
 */
export function useMapOnTv({
	adventureId,
	ready,
	title,
	version,
}: {
	adventureId: string;
	/** The map has its places and is standing still (not walking the star). */
	ready: boolean;
	/** The name shown on the TV. */
	title: string;
	/** Changes whenever the map looks different. */
	version: string;
}): RefObject<View | null> {
	const ref = useRef<View>(null);
	const connected = useCastConnected();
	const loadImage = useTvImage();
	const latest = useRef({ loadImage, title });
	useEffect(() => {
		latest.current = { loadImage, title };
	});

	useEffect(() => {
		if (!(connected && ready)) {
			return;
		}
		let live = true;
		const run = async () => {
			try {
				const view = ref.current;
				if (!view) {
					return;
				}
				// Loaded on demand: a build without the native module just fails here, quietly.
				const { captureRef } = await import("react-native-view-shot");
				const uri = await captureRef(view, {
					format: "jpg",
					quality: JPEG_QUALITY,
					result: "tmpfile",
				});
				const bytes = await readPicture(uri);
				if (!bytes) {
					return;
				}
				// The engine signs the upload for exactly this many bytes.
				const target = await castMap(adventureId, bytes.size);
				if (!(live && target)) {
					return;
				}
				const put = await fetch(target.putUrl, {
					body: bytes,
					headers: { "content-type": IMAGE_TYPE },
					method: "PUT",
				});
				if (live && put.ok) {
					await latest.current.loadImage({
						title: latest.current.title,
						url: target.url,
					});
				}
			} catch {
				// The map must never fail because of the TV.
			}
		};
		const timer = setTimeout(run, SETTLE_MS);
		return () => {
			live = false;
			clearTimeout(timer);
		};
	}, [adventureId, connected, ready, version]);

	return ref;
}
