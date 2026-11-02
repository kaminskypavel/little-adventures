import { PrimaryButton } from "@little-adventures/native-ui/button";
import { characterShadow } from "@little-adventures/native-ui/character";
import { ClayText } from "@little-adventures/native-ui/clay-text";
import { FallbackImage } from "@little-adventures/native-ui/fallback-image";
import { useCalm } from "@little-adventures/native-ui/motion-provider";
import {
	PeekRidge,
	type RidgePerson,
} from "@little-adventures/native-ui/peek-ridge";
import { Plate } from "@little-adventures/native-ui/plate";
import { ProgressBar } from "@little-adventures/native-ui/progress-bar";
import { Screen } from "@little-adventures/native-ui/screen";
import { StatusPill } from "@little-adventures/native-ui/status-pill";
import {
	colors,
	layout,
	motion,
	spacing,
} from "@little-adventures/native-ui/tokens";
import { WaitLoop } from "@little-adventures/native-ui/wait-loop";
import { NotificationFeedbackType, notificationAsync } from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import {
	type StyleProp,
	StyleSheet,
	useWindowDimensions,
	View,
	type ViewStyle,
} from "react-native";
import Animated, {
	cubicBezier,
	useAnimatedReaction,
	useFrameCallback,
	useSharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import {
	getAdventure,
	loaderFacts,
	startAdventure,
	watchMaking,
} from "@/src/data/adventure-client";
import type { Style } from "@/src/data/engine-client";
import { grownUpPicture } from "@/src/data/profile-map";
import { useChild, useGrownUpPhoto } from "@/src/data/profile-queries";
import {
	clearSpokenQuestion,
	getSpokenFacts,
	getSpokenQuestion,
	useSpokenHydrated,
} from "@/src/data/spoken-question";
import { toStyle } from "@/src/data/styles";
import type { Adventure } from "@/src/data/types";
import { dev } from "@/src/dev-param";

const LOADER = require("../assets/story/loader.mp4");

// Progress math, exactly as the design writes it. dt is in seconds.
const CREEP_TO = 0.88; // the bar creeps toward this and never stops moving
const CREEP_RATE = 0.045;
const FINISH_RATE = 2.5; // once the server says ready, the last stretch fills fast
const FINISH_PUSH = 0.2;
const DONE_AT = 0.998;
const MAX_DT = 0.1; // a stalled frame must not make the bar jump
const FIRST_STATUS_END = 0.35;
const SECOND_STATUS_END = 0.7;

// Round 7 10a at 0.72 scale (px / 0.72), measured from the screen top. The wait bar and its
// status sit over the loop; the ready state below is one flowing column.
const BAR_TOP = 508;
const STATUS_TOP = 539;
// Above the progress bar: under the pill the child's picture on the hill would cover them.
const FACTS_HEIGHT = 64;
const FACTS_TOP = BAR_TOP - FACTS_HEIGHT - 10;
const FACTS_LINE = 24;
const FACT_EVERY_MS = 5000;

// Ready column: headline, question, goal picture, then Start in the dock. Only the
// goal picture flexes: 319 x 328 at most, about 150 tall at the least.
const GOAL_WIDTH = 319;
const GOAL_HEIGHT = 328;
const GOAL_MIN_HEIGHT = 150;
const COLUMN_GAP = 12;
const HEADLINE_SIZE = 37; // DESIGN.md size for two long lines
const HEADLINE_LINE = 40;
const NARROW_WIDTH = 390; // windows narrower than this (iPhone SE, 375) get the smaller headline
const NARROW_SIZE = 35;
const NARROW_LINE = 38;

const REVEAL_MS = 500; // progress, status, title, plates and Start
const POP_MS = 1100;
const FAIL_AFTER_MS = 4000;
const FALLBACK_NOUN = "goal";
const LAST_WORD = /\S+$/u;

const pop = {
	from: { opacity: 0, transform: [{ scale: 0.5 }] },
	to: { opacity: 1, transform: [{ scale: 1 }] },
};
const fadeIn = { from: { opacity: 0 }, to: { opacity: 1 } };
const overshoot = cubicBezier(...motion.overshoot);

function stageOf(p: number) {
	"worklet";
	if (p < FIRST_STATUS_END) {
		return 0;
	}
	return p < SECOND_STATUS_END ? 1 : 2;
}

/**
 * The wait bar, driven frame by frame on the UI thread. It creeps toward 88 percent; after
 * `finish()` it fills the rest in about 1.5 s and then reports `full`.
 */
function useWaitProgress() {
	const progress = useSharedValue(0);
	const finishing = useSharedValue(false);
	const stopped = useSharedValue(false);
	const [stage, setStage] = useState(0);
	const [full, setFull] = useState(false);

	const frame = useFrameCallback((info) => {
		if (stopped.get()) {
			return;
		}
		const dt = Math.min(MAX_DT, (info.timeSincePreviousFrame ?? 16) / 1000);
		const p = progress.get();
		if (!finishing.get()) {
			progress.set(p + (CREEP_TO - p) * Math.min(1, dt * CREEP_RATE));
			return;
		}
		const next = p + (1 - p) * Math.min(1, dt * FINISH_RATE) + dt * FINISH_PUSH;
		if (next < DONE_AT) {
			progress.set(next);
			return;
		}
		progress.set(1);
		stopped.set(true);
		scheduleOnRN(setFull, true);
	});

	useEffect(() => {
		if (full) {
			frame.setActive(false);
		}
	}, [frame, full]);

	useAnimatedReaction(
		() => stageOf(progress.get()),
		(now, before) => {
			if (now !== before) {
				scheduleOnRN(setStage, now);
			}
		}
	);

	const finish = useCallback(() => finishing.set(true), [finishing]);
	return { finish, full, progress, stage };
}

/** What the first stage says, by the chosen style. */
const FIRST_STAGE: Record<Style, string> = {
	animated: "Lighting the scene",
	clay: "Mixing the clay",
	felt: "Stitching the felt",
	wood: "Carving the wood",
};

function statusText(stage: number, full: boolean, noun: string, style: Style) {
	if (full) {
		return "All ready";
	}
	if (stage === 0) {
		return FIRST_STAGE[style];
	}
	return stage === 1 ? `Shaping the ${noun}` : "Almost there";
}

/** "Goodnight moon" -> "moon". */
const nounOf = (name: string) =>
	LAST_WORD.exec(name.trim())?.[0] ?? FALLBACK_NOUN;

/** Fades its content in or out. Hidden content is also hidden from screen readers and touches. */
function Fade({
	children,
	ms,
	show,
	style,
}: {
	children: ReactNode;
	ms: number;
	show: boolean;
	style?: StyleProp<ViewStyle>;
}) {
	return (
		<Animated.View
			aria-hidden={!show}
			pointerEvents={show ? "box-none" : "none"}
			style={[
				style,
				{
					opacity: show ? 1 : 0,
					transitionDuration: `${ms}ms`,
					transitionProperty: "opacity",
					transitionTimingFunction: "ease",
				},
			]}
		>
			{children}
		</Animated.View>
	);
}

/**
 * One fun fact at a time, two lines at most, changing every 5 s. The box keeps its two-line
 * height so nothing moves. Reduced motion switches the fact without the fade.
 */
function FactTicker({ calm, facts }: { calm: boolean; facts: string[] }) {
	const [index, setIndex] = useState(0);
	const [shown, setShown] = useState(true);
	useEffect(() => {
		if (facts.length < 2) {
			return;
		}
		let swap: ReturnType<typeof setTimeout> | undefined;
		const timer = setInterval(() => {
			if (calm) {
				setIndex((i) => (i + 1) % facts.length);
				return;
			}
			setShown(false);
			swap = setTimeout(() => {
				setIndex((i) => (i + 1) % facts.length);
				setShown(true);
			}, motion.exit);
		}, FACT_EVERY_MS);
		return () => {
			clearInterval(timer);
			clearTimeout(swap);
		};
	}, [calm, facts.length]);
	return (
		<Fade ms={calm ? 0 : motion.enter} show={shown} style={styles.fact}>
			<ClayText
				align="center"
				color={colors.cream}
				numberOfLines={2}
				style={styles.factText}
				variant="label"
			>
				{facts[index % facts.length]}
			</ClayText>
		</Fade>
	);
}

/**
 * Who peeks over the ridge: the child, and the grown-up when they come along. The puppy is in
 * the loop already, so it gets no picture.
 */
function useRidgePeople(): {
	child: RidgePerson;
	companion: RidgePerson | null;
} {
	const { data: grownUpPhoto } = useGrownUpPhoto();
	const { data } = useChild();
	const child = { cut: data?.cutUrl ?? null, round: data?.avatarUrl ?? null };
	if (!data?.profile.grownUp) {
		return { child, companion: null };
	}
	return {
		child,
		companion: {
			cut: grownUpPhoto?.cutUrl ?? null,
			round: grownUpPhoto ? grownUpPicture(grownUpPhoto) : null,
		},
	};
}

/** 10a Making your adventure, then 10b Ready in place. */
export default function Making() {
	const router = useRouter();
	const calm = useCalm();
	const narrow = useWindowDimensions().width < NARROW_WIDTH;
	const headline = {
		fontSize: narrow ? NARROW_SIZE : HEADLINE_SIZE,
		lineHeight: narrow ? NARROW_LINE : HEADLINE_LINE,
	};
	const {
		fail,
		id: madeId,
		question: picked = "",
		style: pickedStyle,
	} = useLocalSearchParams<{
		fail?: string;
		/** The adventure already started for this screen: a refresh picks it up from the database. */
		id?: string;
		question?: string;
		style?: string;
	}>();
	const style = toStyle(pickedStyle);
	const ridgePeople = useRidgePeople();
	// Read once: the id this screen writes into the address must not start it again.
	const [resumeId] = useState(madeId);
	// A picked idea arrives in the address; the child's own spoken question never does (it waits
	// on the device). Read once, after the device storage is back, so clearing it later changes
	// nothing here.
	const hydrated = useSpokenHydrated();
	const [question, setQuestion] = useState<string | null>(null);
	// Read with the question, for the same reason: the store is cleared when the adventure starts.
	const [facts, setFacts] = useState<string[]>([]);
	useEffect(() => {
		if (hydrated && question === null) {
			const asked = picked || getSpokenQuestion();
			setQuestion(asked);
			// Listening asks for the facts early; when they are not in yet (or the question is a
			// picked idea), ask here: the wait is long, so a few seconds still leave plenty to show.
			const ready = picked ? [] : getSpokenFacts();
			if (ready.length > 0) {
				setFacts(ready);
			} else if (asked) {
				loaderFacts(asked).then(setFacts);
			}
		}
	}, [hydrated, picked, question]);
	const [adventureId, setAdventureId] = useState<string | null>(null);
	const [adventure, setAdventure] = useState<Adventure | null>(null);
	const [noun, setNoun] = useState(FALLBACK_NOUN);
	const [engineStage, setEngineStage] = useState<number | null>(null);
	const [serverReady, setServerReady] = useState(false);
	const { finish, full, progress, stage } = useWaitProgress();

	const revealed = full && adventure !== null;
	// The child's own question stays on screen. A recorded adventure answers a fixed question, so
	// its question is only the fallback.
	const shownQuestion = question || (adventure?.question ?? "");
	const fadeMs = calm ? motion.reducedReveal : REVEAL_MS;

	useEffect(() => {
		if (dev(fail) === "1") {
			const timer = setTimeout(() => router.replace("/oops"), FAIL_AFTER_MS);
			return () => clearTimeout(timer);
		}
		if (question === null) {
			return; // still reading the device storage
		}
		// Nothing to start and nothing started: go Home.
		if (!(question || resumeId)) {
			router.replace("/home");
			return;
		}
		let live = true;
		let stop: (() => void) | undefined;

		const loadMade = async (id: string) => {
			try {
				const made = await getAdventure(id);
				if (live) {
					setAdventure(made);
				}
			} catch {
				router.replace("/oops");
			}
		};
		const run = async () => {
			let id = resumeId ?? "";
			if (!id) {
				try {
					({ id } = await startAdventure(question, style));
				} catch {
					if (live) {
						router.replace("/oops");
					}
					return;
				}
				// The adventure lives in the database now; its id in the address survives a refresh,
				// and the child's words are no longer needed on the device.
				router.setParams({ id });
				clearSpokenQuestion();
			}
			if (!live) {
				return;
			}
			setAdventureId(id);
			stop = watchMaking(id, (status) => {
				if (!live) {
					return;
				}
				if (status.state === "failed") {
					router.replace("/oops");
					return;
				}
				if (status.goalName) {
					setNoun(nounOf(status.goalName));
				}
				if (status.state === "ready") {
					stop?.();
					setServerReady(true);
					finish();
					loadMade(id);
				} else if (status.stage !== undefined) {
					setEngineStage(status.stage);
				}
			});
		};
		run();
		return () => {
			live = false;
			stop?.();
		};
	}, [fail, finish, question, resumeId, router, style]);

	useEffect(() => {
		if (revealed) {
			notificationAsync(NotificationFeedbackType.Success);
		}
	}, [revealed]);

	let goalMotion: object = { opacity: 0, transform: [{ scale: 0.5 }] };
	if (revealed) {
		goalMotion = {
			animationDuration: calm ? `${motion.reducedReveal}ms` : `${POP_MS}ms`,
			animationFillMode: "both",
			animationName: calm ? fadeIn : pop,
			animationTimingFunction: calm ? "ease" : overshoot,
		};
	} else if (calm) {
		goalMotion = { opacity: 0 };
	}

	return (
		<View style={styles.root}>
			<WaitLoop away={revealed} fast={serverReady && !full} source={LOADER} />
			<PeekRidge
				away={revealed}
				child={ridgePeople.child}
				companion={ridgePeople.companion}
				stage={engineStage ?? stage}
			/>
			<Screen
				bodyStyle={styles.body}
				dock={
					<Fade ms={fadeMs} show={revealed}>
						<PrimaryButton
							icon="play"
							label="Start"
							onPress={() =>
								router.replace({
									params: { id: adventureId },
									pathname: "/map",
								})
							}
						/>
					</Fade>
				}
			>
				<View style={styles.headline}>
					<Fade ms={fadeMs} show={!revealed} style={styles.headlineMaking}>
						<ClayText
							accessibilityRole="header"
							align="center"
							color={colors.cream}
							style={headline}
							variant="headline"
						>
							{"Making\nyour adventure"}
						</ClayText>
					</Fade>
					<Fade ms={fadeMs} show={revealed}>
						<ClayText
							accessibilityRole="header"
							align="center"
							color={colors.cream}
							style={headline}
							variant="headline"
						>
							{"Your\nadventure is ready!"}
						</ClayText>
					</Fade>
				</View>
				<Fade
					ms={fadeMs}
					show={!revealed}
					style={[styles.row, { top: BAR_TOP }]}
				>
					<ProgressBar progress={progress} />
				</Fade>
				<Fade
					ms={fadeMs}
					show={!revealed}
					style={[styles.row, { top: STATUS_TOP }]}
				>
					<StatusPill
						text={statusText(engineStage ?? stage, full, noun, style)}
					/>
				</Fade>
				{facts.length > 0 ? (
					<Fade
						ms={fadeMs}
						show={!revealed}
						style={[styles.row, { top: FACTS_TOP }]}
					>
						<FactTicker calm={calm} facts={facts} />
					</Fade>
				) : null}
				<Fade ms={fadeMs} show={revealed}>
					<Plate label={shownQuestion} variant="question" />
				</Fade>
				<View pointerEvents="none" style={styles.goalBox}>
					{adventure ? (
						<Animated.View style={[styles.goalFrame, goalMotion]}>
							<FallbackImage
								accessibilityIgnoresInvertColors
								contentFit="contain"
								kind="goalClosed"
								source={adventure.endGoal.closed}
								style={styles.goal}
							/>
						</Animated.View>
					) : null}
				</View>
			</Screen>
		</View>
	);
}

const styles = StyleSheet.create({
	body: {
		gap: COLUMN_GAP,
		paddingBottom: spacing.lg, // the 22 pt between the goal picture and Start
		paddingHorizontal: layout.sideMargin,
		paddingTop: layout.titleTop,
	},
	// On the moving loader, so on the pill's own dark backing to stay readable.
	fact: {
		alignItems: "center",
		backgroundColor: colors.statusPill,
		borderRadius: 18,
		height: FACTS_HEIGHT,
		justifyContent: "center",
		maxWidth: 320,
		paddingHorizontal: 16,
	},
	factText: { lineHeight: FACTS_LINE },
	goal: { height: "100%", width: "100%" },
	goalBox: {
		alignItems: "center",
		flex: 1,
		justifyContent: "center",
		minHeight: GOAL_MIN_HEIGHT,
	},
	goalFrame: {
		aspectRatio: GOAL_WIDTH / GOAL_HEIGHT,
		...characterShadow,
		height: "100%",
		maxHeight: GOAL_HEIGHT,
	},
	headline: { alignItems: "stretch" },
	headlineMaking: { left: 0, position: "absolute", right: 0, top: 0 },
	root: { flex: 1 },
	row: {
		left: layout.sideMargin,
		position: "absolute",
		right: layout.sideMargin,
	},
});
