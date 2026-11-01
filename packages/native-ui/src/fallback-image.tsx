import { Image, type ImageProps, type ImageSource } from "expo-image";
import { createContext, type ReactNode, useContext, useState } from "react";
import {
	type ArtKind,
	type FallbackArt,
	pickSource,
	sourceKey,
} from "./fallback-source";

export type { ArtKind, FallbackArt } from "./fallback-source";

const FallbackArtContext = createContext<FallbackArt | null>(null);

/** Gives every FallbackImage below it the bundled stand-in pictures. Without one, there is only the placeholder. */
export function FallbackArtProvider({
	art,
	children,
}: {
	art: FallbackArt;
	children: ReactNode;
}) {
	return <FallbackArtContext value={art}>{children}</FallbackArtContext>;
}

/**
 * An image that shows its kind's bundled stand-in when `source` is null or fails to load. With no
 * stand-in either, it shows `placeholder` (or nothing). `onError` still fires for the failed source.
 */
export function FallbackImage({
	kind,
	onError,
	placeholder = null,
	source,
	...props
}: Omit<ImageProps, "source"> & {
	kind: ArtKind;
	placeholder?: ReactNode;
	source: ImageSource | number | null;
}) {
	const art = useContext(FallbackArtContext);
	// The failed source is remembered by key, so a new source is tried again.
	const [failedKey, setFailedKey] = useState<string | null>(null);
	const shown = pickSource(source, failedKey, art?.[kind] ?? null);
	if (shown === null) {
		return placeholder;
	}
	return (
		<Image
			{...props}
			onError={(event) => {
				setFailedKey(sourceKey(source));
				onError?.(event);
			}}
			source={shown}
		/>
	);
}
