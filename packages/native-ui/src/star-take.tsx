import { useEventListener } from "expo";
import { useVideoPlayer, VideoView } from "expo-video";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Character, characterShadow } from "./character";
import { useCalm } from "./motion-provider";
import { starSource } from "./star-source";
import type { StarTakeName } from "./star-source-files";

export type { StarTakeName } from "./star-source-files";

/** The slot the chain starts on (see `startChain`). */
const FIRST_SLOT_ID = 0;

// The takes are 768 px squares with padding. The star is 420 px wide and sits a little low, so this
// box puts it where a still star of the same width would be (see the chainable takes learning).
// maxWidth matches width because web CSS resets cap video elements at 100% of their parent.
const videoBox = {
	aspectRatio: 1,
	left: "-41.43%",
	maxWidth: "182.86%",
	position: "absolute",
	top: "-54.2%",
	width: "182.86%",
} as const;

const READY_POLL_MS = 50;

// The hidden slot is not fully transparent on purpose. Chrome stops painting a video at opacity 0,
// so the first frame after the swap arrives one compositor frame late and the star blinks.
// At 0.01 the video keeps painting and the swap is seamless; 1% of the star is not visible.
const HIDDEN_OPACITY = 0.01;

type SlotIndex = 0 | 1;
interface Held {
	id: number;
	ready: boolean;
	take: StarTakeName;
}

interface Chain {
	/** The visible take has played to its end and waits for the hidden one to take over. */
	ended: boolean;
	/** The last gesture that ran to its end. `n` makes repeats of the same take distinct. */
	finished: { n: number; take: StarTakeName } | null;
	front: SlotIndex;
	/** Hold mode: a new take cuts the current one, and the requested take repeats. */
	hold: boolean;
	nextId: number;
	/** A gesture waiting for the visible take to end. Never cuts a take short. */
	queued: StarTakeName | null;
	/** The last `take` prop seen. */
	requested: StarTakeName;
	slots: readonly [Held, Held];
}

type ChainEvent =
	| { hold: boolean; type: "take"; take: StarTakeName }
	| { type: "ready"; id: number }
	| { type: "end"; slot: SlotIndex };

const slotIndexes = [0, 1] as const;
const otherSlot = (slot: SlotIndex): SlotIndex => (slot === 0 ? 1 : 0);

function withSlot(
	slots: readonly [Held, Held],
	at: SlotIndex,
	held: Held
): readonly [Held, Held] {
	return at === 0 ? [held, slots[1]] : [slots[0], held];
}

/** The hidden slot must hold what plays next: the queued gesture, else idle. */
function load(chain: Chain): Chain {
	const hidden = otherSlot(chain.front);
	const want = chain.queued ?? "idle";
	if (chain.slots[hidden].take === want) {
		return chain;
	}
	return {
		...chain,
		nextId: chain.nextId + 1,
		slots: withSlot(chain.slots, hidden, {
			id: chain.nextId,
			ready: false,
			take: want,
		}),
	};
}

/** Once the visible take ended and the hidden one has its first frame, show the hidden one. */
function swap(chain: Chain): Chain {
	const hidden = otherSlot(chain.front);
	const next = chain.slots[hidden];
	if (!(chain.ended && next.ready)) {
		return chain;
	}
	const done = chain.slots[chain.front].take;
	return load({
		...chain,
		ended: false,
		finished:
			done === "idle"
				? chain.finished
				: { n: (chain.finished?.n ?? 0) + 1, take: done },
		front: hidden,
		// A held take stays queued so it plays again when it ends.
		queued: chain.queued === next.take && !chain.hold ? null : chain.queued,
	});
}

const settle = (chain: Chain): Chain => swap(load(chain));

function reduce(chain: Chain, event: ChainEvent): Chain {
	switch (event.type) {
		case "take":
			if (event.take === chain.requested) {
				return event.hold === chain.hold
					? chain
					: { ...chain, hold: event.hold };
			}
			return settle({
				...chain,
				// Hold mode does not wait for the visible take: it hands over as soon as the
				// next one has a frame.
				ended: event.hold ? true : chain.ended,
				hold: event.hold,
				queued: event.take === "idle" ? null : event.take,
				requested: event.take,
			});
		case "ready": {
			const [a, b] = chain.slots;
			const mark = (held: Held): Held =>
				held.id === event.id ? { ...held, ready: true } : held;
			return settle({ ...chain, slots: [mark(a), mark(b)] });
		}
		case "end":
			if (event.slot !== chain.front || chain.ended) {
				return chain;
			}
			return settle({ ...chain, ended: true });
		default:
			return chain;
	}
}

function startChain(take: StarTakeName): Chain {
	return {
		ended: false,
		finished: null,
		front: 0,
		hold: false,
		nextId: 2,
		queued: null,
		requested: take,
		slots: [
			{ id: 0, ready: true, take },
			{ id: 1, ready: false, take: "idle" },
		],
	};
}

interface StarSlotProps {
	active: boolean;
	id: number;
	onEnd: () => void;
	onReady: (id: number) => void;
	take: StarTakeName;
}

// One player and one view for one take. Its source is set when it is created and never changes:
// the chain mounts a fresh slot for the hidden side, so the visible side is never reloaded.
function StarSlot({ active, id, onEnd, onReady, take }: StarSlotProps) {
	const player = useVideoPlayer(starSource(take), (created) => {
		created.muted = true;
	});

	// Only the visible slot plays, so only it reports an end.
	useEventListener(player, "playToEnd", onEnd);

	// Showing a slot also starts it from frame 0. A slot that played before (idle after idle)
	// still shows its last frame, which is the same pose as frame 0, so the handover cannot jump.
	useEffect(() => {
		if (active) {
			player.replay();
		}
	}, [active, player]);

	// Ready means data is loaded, so frame 0 is on screen when the slot is shown. Polled, because
	// on web the load events can fire before the player has attached its listeners.
	useEffect(() => {
		const timer = setInterval(() => {
			if (player.status === "readyToPlay" || player.bufferedPosition > 0) {
				clearInterval(timer);
				onReady(id);
			}
		}, READY_POLL_MS);
		return () => clearInterval(timer);
	}, [player, id, onReady]);

	return (
		<VideoView
			allowsPictureInPicture={false}
			contentFit="contain"
			nativeControls={false}
			player={player}
			playsInline
			style={[videoBox, { opacity: active ? 1 : HIDDEN_OPACITY }]}
			surfaceType="textureView"
		/>
	);
}

interface StarTakeProps {
	/**
	 * Follow `take` live: a new take starts at once instead of waiting for the current one to end,
	 * and the take repeats for as long as it is asked for. For a take tied to a held button.
	 */
	hold?: boolean;
	/** Called when a gesture has played to its end and the star is back on idle. */
	onTakeEnd?: (take: StarTakeName) => void;
	/** Width of the star. The star lands where a still star of this width would. */
	size: number;
	/** Rest on idle. A new take plays once at the end of the current one, then idle returns. */
	take?: StarTakeName;
}

/**
 * The animated star: transparent video takes that chain without a flash. Two slots stay mounted,
 * the hidden one already holds the next take, and a handover only swaps their opacity.
 */
export function StarTake({
	hold = false,
	onTakeEnd,
	size,
	take = "idle",
}: StarTakeProps) {
	const calm = useCalm();
	const [chain, dispatch] = useReducer(reduce, take, startChain);

	useEffect(() => {
		dispatch({ hold, take, type: "take" });
	}, [hold, take]);

	const reported = useRef(0);
	useEffect(() => {
		const done = chain.finished;
		if (done && done.n > reported.current) {
			reported.current = done.n;
			onTakeEnd?.(done.take);
		}
	}, [chain.finished, onTakeEnd]);

	// The still star covers the box until the first take has a frame, so there is no empty box.
	const [loaded, setLoaded] = useState(false);
	const handleReady = useCallback((id: number) => {
		dispatch({ id, type: "ready" });
		if (id === FIRST_SLOT_ID) {
			setLoaded(true);
		}
	}, []);

	if (calm) {
		return <Character kind="star" size={size} />;
	}

	return (
		<View
			accessibilityLabel="The happy star"
			accessibilityRole="image"
			pointerEvents="none"
			style={[styles.box, characterShadow, { height: size, width: size }]}
		>
			{loaded ? null : (
				<View style={styles.still}>
					<Character kind="star" size={size} />
				</View>
			)}
			{slotIndexes.map((index) => (
				<StarSlot
					active={chain.front === index}
					id={chain.slots[index].id}
					key={chain.slots[index].id}
					onEnd={() => dispatch({ slot: index, type: "end" })}
					onReady={handleReady}
					take={chain.slots[index].take}
				/>
			))}
		</View>
	);
}

const styles = StyleSheet.create({
	box: { overflow: "visible" },
	still: { left: 0, position: "absolute", top: 0 },
});
