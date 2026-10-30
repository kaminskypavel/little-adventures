import { PrimaryButton } from "@little-adventures/native-ui/button";
import { characterFilter } from "@little-adventures/native-ui/character";
import { ClayText } from "@little-adventures/native-ui/clay-text";
import { useCalm } from "@little-adventures/native-ui/motion-provider";
import { Plate } from "@little-adventures/native-ui/plate";
import { ProgressBar } from "@little-adventures/native-ui/progress-bar";
import { Screen } from "@little-adventures/native-ui/screen";
import { StatusPill } from "@little-adventures/native-ui/status-pill";
import { colors, layout, motion } from "@little-adventures/native-ui/tokens";
import { WaitLoop } from "@little-adventures/native-ui/wait-loop";
import { WatchHill } from "@little-adventures/native-ui/watch-hill";
import { NotificationFeedbackType, notificationAsync } from "expo-haptics";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";
import Animated, {
	cubicBezier,
	useAnimatedReaction,
	useFrameCallback,
	useSharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import {
	getAdventure,
	startAdventure,
	watchMaking,
} from "@/src/data/adventure-client";
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

// Round 7 10a and 10b at 0.72 scale (px / 0.72), measured from the screen top.
const BAR_TOP = 508;
const STATUS_TOP = 539;
const QUESTION_TOP = 172;
const GOAL_TOP = 244;
const GOAL_WIDTH = 319;
const GOAL_HEIGHT = 328;
const BIG_PLATE_TOP = 583;

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

function statusText(stage: number, full: boolean, noun: string) {
	if (full) {
		return "All ready";
	}
	if (stage === 0) {
		return "Mixing the clay";
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

/** 10a Making your adventure, then 10b Ready in place. */
export default function Making() {
	const router = useRouter();
	const calm = useCalm();
	const { fail, question = "" } = useLocalSearchParams<{
		fail?: string;
		question?: string;
	}>();
	const [adventureId, setAdventureId] = useState<string | null>(null);
	const [adventure, setAdventure] = useState<Adventure | null>(null);
	const [noun, setNoun] = useState(FALLBACK_NOUN);
	const [serverReady, setServerReady] = useState(false);
	const { finish, full, progress, stage } = useWaitProgress();

	const revealed = full && adventure !== null;
	const fadeMs = calm ? motion.reducedReveal : REVEAL_MS;

	useEffect(() => {
		if (dev(fail) === "1") {
			const timer = setTimeout(() => router.replace("/oops"), FAIL_AFTER_MS);
			return () => clearTimeout(timer);
		}
		let live = true;
		let stop: (() => void) | undefined;

		// The status line names the end goal, so ask early. A miss only keeps the fallback noun.
		const loadNoun = async (id: string) => {
			try {
				const early = await getAdventure(id);
				if (live) {
					setNoun(nounOf(early.endGoal.name));
				}
			} catch {
				// keep the fallback noun
			}
		};
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
			const { id } = await startAdventure(question);
			if (!live) {
				return;
			}
			setAdventureId(id);
			loadNoun(id);
			stop = watchMaking(id, (status) => {
				if (!live) {
					return;
				}
				if (status.state === "failed") {
					router.replace("/oops");
				} else if (status.state === "ready") {
					stop?.();
					setServerReady(true);
					finish();
					loadMade(id);
				}
			});
		};
		run();
		return () => {
			live = false;
			stop?.();
		};
	}, [fail, finish, question, router]);

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
			<WatchHill away={revealed} />
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
				<Fade ms={fadeMs} show={!revealed} style={styles.title}>
					<ClayText
						accessibilityRole="header"
						align="center"
						color={colors.cream}
						variant="headline"
					>
						{"Making your\nadventure"}
					</ClayText>
				</Fade>
				<Fade ms={fadeMs} show={revealed} style={styles.title}>
					<ClayText
						accessibilityRole="header"
						align="center"
						color={colors.cream}
						variant="headline"
					>
						{"Your adventure\nis ready!"}
					</ClayText>
				</Fade>
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
					<StatusPill text={statusText(stage, full, noun)} />
				</Fade>
				<Fade
					ms={fadeMs}
					show={revealed}
					style={[styles.row, { top: QUESTION_TOP }]}
				>
					<Plate
						label={question || (adventure?.question ?? "")}
						variant="question"
					/>
				</Fade>
				{adventure ? (
					<View
						pointerEvents="none"
						style={[styles.row, styles.rowCentered, { top: GOAL_TOP }]}
					>
						<Animated.View
							style={[
								{
									filter: characterFilter,
									height: GOAL_HEIGHT,
									width: GOAL_WIDTH,
								},
								goalMotion,
							]}
						>
							<Image
								accessibilityIgnoresInvertColors
								contentFit="contain"
								source={adventure.endGoal.closed}
								style={styles.goal}
							/>
						</Animated.View>
					</View>
				) : null}
				<Fade
					ms={fadeMs}
					show={revealed}
					style={[styles.row, styles.rowCentered, { top: BIG_PLATE_TOP }]}
				>
					<Plate
						label={adventure?.endGoal.name ?? ""}
						style={styles.bigPlate}
						variant="big"
					/>
				</Fade>
			</Screen>
		</View>
	);
}

const styles = StyleSheet.create({
	bigPlate: { alignSelf: "center" },
	body: { paddingHorizontal: 0 },
	goal: { height: "100%", width: "100%" },
	root: { flex: 1 },
	row: {
		left: layout.sideMargin,
		position: "absolute",
		right: layout.sideMargin,
	},
	rowCentered: { alignItems: "center" },
	title: {
		left: layout.sideMargin,
		position: "absolute",
		right: layout.sideMargin,
		top: layout.titleTop,
	},
});
