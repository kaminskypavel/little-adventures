import { useCallback, useRef, useState } from "react";
import {
	loaderFacts,
	shortQuestion,
	transcribe,
} from "@/src/data/adventure-client";
import { askMicPermission } from "@/src/data/mic-permission";
import { useRecorder } from "@/src/data/recorder";
import { setSpokenFacts, setSpokenQuestion } from "@/src/data/spoken-question";
import { canRecord, heldLongEnough } from "@/src/data/voice-rules";
import { type Hint, haloState } from "./ask-copy";

/** What the words in a recording came to: the text, whether it is a question, and its short form. */
async function understand(stop: () => Promise<Uint8Array>) {
	let question = "";
	let short = "";
	let isQuestion = true;
	try {
		question = (await transcribe(await stop())).trim();
		if (question) {
			({ isQuestion, short } = await shortQuestion(question));
		}
	} catch {
		// Counts as not heard: the same line as an empty recording.
	}
	return { isQuestion, question, short };
}

/**
 * Hold to talk, shared by Home and Listening: hold records, letting go sends. `onQuestion` runs
 * once a question is in (the words and the short form), after they are stored for Verify.
 * Call `arm` when the child can start asking (it asks for the mic once) and `disarm` when they
 * leave: that lets go of the mic and drops anything still in flight. It never records without a
 * press.
 */
export function useAsk(onQuestion: () => void) {
	const { level, start, stop } = useRecorder();
	// Bumped when asking ends: anything still in flight from before is dropped.
	const session = useRef<number>(0);
	const held = useRef<boolean>(false);
	const recording = useRef<boolean>(false);
	const busy = useRef<boolean>(false);
	const downAt = useRef<number>(0);
	const finishRef = useRef<() => void>(() => undefined);
	const questionRef = useRef(onQuestion);
	questionRef.current = onQuestion;
	const [pressing, setPressing] = useState(false);
	const [thinking, setThinking] = useState(false);
	const [hint, setHint] = useState<Hint>("ask");

	const arm = useCallback((onDenied?: () => void) => {
		const sid = session.current;
		busy.current = false;
		setThinking(false);
		setPressing(false);
		setHint("ask");
		askMicPermission().then((permission) => {
			if (session.current === sid && !canRecord(permission)) {
				onDenied?.();
			}
		});
	}, []);

	const disarm = useCallback(() => {
		session.current += 1;
		held.current = false;
		if (recording.current) {
			recording.current = false;
			stop().catch(() => undefined);
		}
	}, [stop]);

	const finish = useCallback(async () => {
		if (!recording.current) {
			return;
		}
		recording.current = false;
		const sid = session.current;
		setPressing(false);
		if (!heldLongEnough(Date.now() - downAt.current)) {
			await stop().catch(() => undefined);
			if (session.current === sid) {
				setHint("short");
			}
			return;
		}
		busy.current = true;
		setThinking(true);
		const { isQuestion, question, short } = await understand(stop);
		if (session.current !== sid) {
			return;
		}
		// Stay here, thinking, until both the words and the short question are in.
		if (question && isQuestion) {
			setSpokenQuestion(question, short);
			// In the background: never awaited, never blocks the check. A newer question wins.
			loaderFacts(question).then((facts) => setSpokenFacts(question, facts));
			questionRef.current();
			return;
		}
		// Never record again by itself: the child presses when ready.
		setHint(question ? "notQuestion" : "missed");
		setThinking(false);
		busy.current = false;
	}, [stop]);
	finishRef.current = finish;

	const onHoldStart = useCallback(async () => {
		if (busy.current || held.current) {
			return;
		}
		const sid = session.current;
		held.current = true;
		downAt.current = Date.now();
		setPressing(true);
		setHint("ask");
		const permission = await askMicPermission();
		if (session.current !== sid) {
			return;
		}
		if (!(canRecord(permission) && held.current)) {
			// Denied, or let go while the system was asking: nothing is recorded.
			held.current = false;
			setPressing(false);
			return;
		}
		try {
			await start(() => finishRef.current());
		} catch {
			held.current = false;
			setPressing(false);
			setHint("missed");
			return;
		}
		if (session.current !== sid) {
			stop().catch(() => undefined);
			return;
		}
		recording.current = true;
		if (!held.current) {
			finishRef.current();
		}
	}, [start, stop]);

	const onHoldEnd = useCallback(() => {
		held.current = false;
		if (recording.current) {
			finishRef.current();
		} else if (!busy.current) {
			// Let go before the recorder was running: nothing to send.
			setPressing(false);
		}
	}, []);

	return {
		arm,
		disarm,
		hint,
		level,
		onHoldEnd,
		onHoldStart,
		pressing,
		state: haloState(pressing, thinking, hint),
		thinking,
	};
}
