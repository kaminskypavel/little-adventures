import { BackButton } from "@little-adventures/native-ui/back-button";
import { ClayText } from "@little-adventures/native-ui/clay-text";
import { MorphPill } from "@little-adventures/native-ui/morph-pill";
import { useCalm } from "@little-adventures/native-ui/motion-provider";
import { Screen } from "@little-adventures/native-ui/screen";
import { SpeechPlate } from "@little-adventures/native-ui/speech-plate";
import { StarTake } from "@little-adventures/native-ui/star-take";
import { TitleHold } from "@little-adventures/native-ui/title-hold";
import { colors, layout, motion } from "@little-adventures/native-ui/tokens";
import { TopBar } from "@little-adventures/native-ui/top-bar";
import { VoiceHalo } from "@little-adventures/native-ui/voice-halo";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import Animated, {
	Easing,
	type EntryExitAnimationFunction,
	FadeOut,
	type SharedValue,
	useAnimatedStyle,
	withTiming,
} from "react-native-reanimated";
import {
	useSafeAreaFrame,
	useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useScreenAdminTools } from "@/src/admin/admin-panel-store";
import { PresetQuestions } from "@/src/admin/preset-questions";
import { beginDraft, prepareChild } from "@/src/data/adventure-client";
import type { AdventureSummary, Idea } from "@/src/data/types";
import { dev } from "@/src/dev-param";
import {
	type ListenLayout,
	listenLayout,
	type RestLayout,
	restLayout,
} from "@/src/home/home-layout";
import { IdeasShelf, YoursShelf } from "@/src/home/shelves";
import { useGreeting } from "@/src/home/use-greeting";
import { useFocusRun, useHomeData, useMicOff } from "@/src/home/use-home";
import { useMorph } from "@/src/home/use-morph";
import { lineFor, takeFor, titleFor } from "@/src/voice/ask-copy";
import { useAsk } from "@/src/voice/use-ask";
import { useMissedTilt } from "@/src/voice/use-tilt";

const PILL_WIDTH = 300;
const MIC = 176;
const PLATE_BOX = 88;
const HINT = { fontSize: 21, lineHeight: 26, opacity: 0.92 } as const;
const MIC_OFF_TEXT = "Ask a grown-up to turn on the mic.";
const FADE_MS = 200;
const overshoot = Easing.bezier(...motion.overshoot);
/** "Hi {name}!" pops in: a little smaller, with the app's overshoot. */
const popIn: EntryExitAnimationFunction = () => {
	"worklet";
	const timing = { duration: motion.enter, easing: overshoot };
	return {
		animations: {
			opacity: withTiming(1, timing),
			transform: [{ scale: withTiming(1, timing) }],
		},
		initialValues: { opacity: 0, transform: [{ scale: 0.92 }] },
	};
};
/** The question comes in as the greeting fades out. */
const fadeIn: EntryExitAnimationFunction = () => {
	"worklet";
	return {
		animations: { opacity: withTiming(1, { duration: FADE_MS }) },
		initialValues: { opacity: 0 },
	};
};
/** The pressed button hides as Home switches state: on web it must not keep the focus. */
function releaseFocus() {
	if (Platform.OS === "web") {
		(globalThis.document?.activeElement as HTMLElement | null)?.blur();
	}
}

// One element for the life of the app, so the admin sheet does not re-register it every render.
const PRESET_TOOLS = <PresetQuestions />;

type AskState = ReturnType<typeof useAsk>;

interface Stage {
	calm: boolean;
	listen: ListenLayout;
	progress: SharedValue<number>;
	rest: RestLayout;
	width: number;
}

/** The star: at rest it waves under the plate; listening it rises and grows, and follows the child's hold. */
function HomeStar({
	ask,
	listening,
	run,
	stage,
}: {
	ask: AskState;
	listening: boolean;
	run: number;
	stage: Stage;
}) {
	const { calm, listen, progress, rest, width } = stage;
	const tiltStyle = useMissedTilt(ask.state === "missed");
	// Drawn at its listening size and scaled down to the resting one.
	const size = listen.starSize;
	const dy = rest.starTop + rest.starSize / 2 - (listen.starTop + size / 2);
	const shrink = rest.starSize / size;
	const style = useAnimatedStyle(() => {
		const p = progress.get();
		if (calm) {
			// No travel: the star is gone for the middle of the cross-fade and back where it belongs.
			const resting = p < 0.5;
			return {
				opacity: Math.abs(1 - 2 * p),
				transform: [
					{ translateY: resting ? dy : 0 },
					{ scale: resting ? shrink : 1 },
				],
			};
		}
		return {
			transform: [
				{ translateY: (1 - p) * dy },
				{ scale: shrink + (1 - shrink) * p },
			],
		};
	});
	return (
		<Animated.View
			pointerEvents="none"
			style={[
				styles.star,
				{
					height: size,
					left: (width - size) / 2,
					top: listen.starTop,
					width: size,
				},
				style,
			]}
		>
			<Animated.View style={tiltStyle}>
				<StarTake
					hold={listening}
					// Not remounted for listening: with `hold` the new take starts as soon as it has a
					// frame while the old one keeps playing, so the star never blinks out.
					key={run}
					size={size}
					take={listening ? takeFor(ask.pressing, ask.thinking) : "wave"}
				/>
			</Animated.View>
		</Animated.View>
	);
}

/** The headline and the hint under the round mic, in once the mic has arrived. */
function ListenWords({
	ask,
	listening,
	progress,
	stage,
}: {
	ask: AskState;
	listening: boolean;
	progress: SharedValue<number>;
	stage: Stage;
}) {
	const style = useAnimatedStyle(() => ({ opacity: progress.get() }));
	return (
		<Animated.View
			aria-hidden={!listening}
			pointerEvents="none"
			style={[styles.words, style]}
		>
			<ClayText
				accessibilityRole="header"
				adjustsFontSizeToFit
				align="center"
				color={colors.cream}
				minimumFontScale={0.7}
				// One line: the hint sits right under it ("That wasn't a question" shrinks to fit).
				numberOfLines={1}
				style={[styles.at, { top: stage.listen.headlineTop }]}
				variant="headline"
			>
				{titleFor(ask.state, ask.hint)}
			</ClayText>
			<ClayText
				align="center"
				color={colors.cream}
				style={[styles.at, HINT, { top: stage.listen.hintTop }]}
				variant="body"
			>
				{lineFor(ask.state, ask.hint)}
			</ClayText>
		</Animated.View>
	);
}

/** The voice halo takes over from the pill where the pill lands, and then takes the holds. */
function HaloSpot({
	ask,
	landed,
	progress,
	stage,
}: {
	ask: AskState;
	landed: boolean;
	progress: SharedValue<number>;
	stage: Stage;
}) {
	const { calm, listen, width } = stage;
	const style = useAnimatedStyle(() => {
		const p = progress.get();
		return { opacity: calm ? p : Number(p >= 1) };
	});
	return (
		<Animated.View
			aria-hidden={!landed}
			pointerEvents={landed ? "auto" : "none"}
			style={[
				styles.halo,
				{ left: width / 2 - MIC / 2, top: listen.micCy - MIC / 2 },
				style,
			]}
		>
			<VoiceHalo
				landed={landed}
				level={ask.level}
				onHoldEnd={ask.onHoldEnd}
				onHoldStart={ask.onHoldStart}
				state={ask.state}
			/>
		</Animated.View>
	);
}

/** Everything that waits while the child asks: the avatar and lock, the plate and Yours. */
function RestLayer({
	data,
	listening,
	micOff,
	onGate,
	onWho,
	onOpen,
	rest,
	run,
	stage,
}: {
	data: ReturnType<typeof useHomeData>;
	listening: boolean;
	micOff: boolean;
	onGate: () => void;
	/** Opens "Who's listening?"; only given when the account has two or more children. */
	onWho?: () => void;
	onOpen: (adventure: AdventureSummary) => void;
	rest: SharedValue<number>;
	run: number;
	stage: Stage;
}) {
	const { adventures, avatar, name } = data;
	const spots = stage.rest;
	const insets = useSafeAreaInsets();
	const style = useAnimatedStyle(() => ({ opacity: rest.get() }));
	// After another child is picked the star greets first (phase 1), then asks (phase 2).
	const greeting = useGreeting(data.childId);
	const hi = greeting === 1 && !micOff;
	let text = `What shall we explore, ${name}?`;
	if (micOff) {
		text = MIC_OFF_TEXT;
	} else if (hi) {
		text = `Hi ${name}!`;
	}
	const { calm } = stage;
	let entering: typeof popIn | undefined;
	if (hi) {
		entering = popIn;
	} else if (greeting === 2) {
		entering = fadeIn;
	}
	return (
		<Animated.View
			aria-hidden={listening}
			pointerEvents={listening ? "none" : "box-none"}
			style={[styles.layer, style]}
		>
			<View
				pointerEvents="box-none"
				style={[styles.topBar, { top: insets.top + 8 }]}
			>
				<TopBar
					action={{
						accessibilityLabel: "Grown-ups",
						icon: "lock",
						onPress: onGate,
					}}
					avatar={name !== null}
					avatarImage={avatar}
					compact
					onAvatarPress={onWho}
					take="wave"
					takeRun={run}
				/>
			</View>
			{name === null ? null : (
				<TitleHold
					style={[
						styles.plate,
						{ top: spots.plateBottom - PLATE_BOX, width: stage.width },
					]}
				>
					<Animated.View
						entering={calm ? undefined : entering}
						exiting={calm ? undefined : FadeOut.duration(FADE_MS)}
						// A new key per line: the old plate fades out as the new one comes in.
						key={hi ? "hi" : "ask"}
					>
						<SpeechPlate width={Math.min(PILL_WIDTH, stage.width - 2 * 22)}>
							{text}
						</SpeechPlate>
					</Animated.View>
				</TitleHold>
			)}
			<YoursShelf
				adventures={adventures}
				labelTop={spots.yoursLabelTop}
				onOpen={onOpen}
				top={spots.yoursTop}
			/>
		</Animated.View>
	);
}

/**
 * The ideas under the mic: another way to start an adventure. They come in with the mic, and
 * fade and take no taps while the child holds the mic or the star is thinking.
 */
function ListenIdeas({
	ask,
	ideas,
	listening,
	onAsk,
	progress,
	stage,
}: {
	ask: AskState;
	ideas: Idea[] | null;
	listening: boolean;
	onAsk: (question: string) => void;
	progress: SharedValue<number>;
	stage: Stage;
}) {
	const style = useAnimatedStyle(() => ({ opacity: progress.get() }));
	const busy = ask.pressing || ask.thinking;
	const open = listening && !busy;
	return (
		<Animated.View
			aria-hidden={!open}
			pointerEvents={open ? "box-none" : "none"}
			style={[styles.layer, style]}
		>
			<Animated.View
				pointerEvents="box-none"
				style={[
					styles.layer,
					{
						opacity: busy ? 0 : 1,
						transitionDuration: `${motion.exit}ms`,
						transitionProperty: "opacity",
					},
				]}
			>
				<IdeasShelf
					ideas={ideas}
					label="Or pick one"
					labelTop={stage.listen.ideasLabelTop}
					onAsk={onAsk}
					top={stage.listen.ideasTop}
				/>
			</Animated.View>
		</Animated.View>
	);
}

export default function Home() {
	useScreenAdminTools("Home", PRESET_TOOLS);
	const router = useRouter();
	const insets = useSafeAreaInsets();
	// The screen the app is drawn in: the window on a phone, the preview phone on web.
	const { height, width } = useSafeAreaFrame();
	const calm = useCalm();
	const params = useLocalSearchParams<{ first?: string; mic?: string }>();
	const data = useHomeData(dev(params.first));
	const mic = useMicOff(params.mic);
	const run = useFocusRun();
	const [listening, setListening] = useState(false);
	const { landed, progress, rest } = useMorph(listening);
	// Home goes on to Verify with a push, so back from Verify is Home again.
	const ask = useAsk(
		useCallback(() => {
			router.push("/verify");
		}, [router])
	);
	const { arm, disarm } = ask;
	// Once per child per app session, however often Home opens; again when another child listens.
	const { childId } = data;
	useFocusEffect(
		useCallback(() => {
			if (childId) {
				prepareChild(childId);
			}
		}, [childId])
	);
	const { deny } = mic;

	const close = useCallback(() => {
		releaseFocus();
		disarm();
		setListening(false);
	}, [disarm]);
	// Leaving Home lets go of the mic; Home is at rest when it gets focus again.
	useFocusEffect(useCallback(() => close, [close]));
	const open = () => {
		releaseFocus();
		setListening(true);
		arm(() => {
			close();
			deny();
		});
	};

	const stage: Stage = {
		calm,
		listen: listenLayout(height, insets),
		progress,
		rest: restLayout(height, insets),
		width,
	};
	const ready = data.name !== null;

	return (
		<Screen>
			<View style={styles.root}>
				<RestLayer
					data={data}
					listening={listening}
					micOff={mic.off}
					onGate={() => router.push("/gate")}
					onOpen={(adventure) =>
						router.push(
							adventure.finished
								? `/end?id=${adventure.id}`
								: `/map?id=${adventure.id}`
						)
					}
					onWho={data.childCount > 1 ? () => router.push("/who") : undefined}
					rest={rest}
					run={run}
					stage={stage}
				/>
				<HomeStar ask={ask} listening={listening} run={run} stage={stage} />
				<MorphPill
					icon="plus"
					label="New adventure"
					listening={listening}
					mic={{ cx: width / 2, cy: stage.listen.micCy }}
					off={mic.off || !ready}
					onPress={open}
					progress={progress}
					rest={{ cx: width / 2, cy: stage.rest.buttonCy }}
					restWidth={Math.min(PILL_WIDTH, width - 2 * layout.sideMargin)}
					size={MIC}
				/>
				<HaloSpot ask={ask} landed={landed} progress={progress} stage={stage} />
				<ListenWords
					ask={ask}
					listening={listening}
					progress={progress}
					stage={stage}
				/>
				<ListenIdeas
					ask={ask}
					ideas={data.ideas}
					listening={listening}
					onAsk={(question) => {
						beginDraft(question);
						router.push({ params: { question }, pathname: "/style" });
					}}
					progress={progress}
					stage={stage}
				/>
				<BackSpot listening={listening} onBack={close} rest={rest} />
			</View>
		</Screen>
	);
}

/** Back from listening to rest, where the avatar was. */
function BackSpot({
	listening,
	onBack,
	rest,
}: {
	listening: boolean;
	onBack: () => void;
	rest: SharedValue<number>;
}) {
	const insets = useSafeAreaInsets();
	const style = useAnimatedStyle(() => ({ opacity: 1 - rest.get() }));
	return (
		<Animated.View
			aria-hidden={!listening}
			pointerEvents={listening ? "auto" : "none"}
			style={[styles.back, { top: insets.top + layout.topBarOffset }, style]}
		>
			<BackButton onPress={onBack} />
		</Animated.View>
	);
}

const styles = StyleSheet.create({
	at: {
		left: layout.sideMargin,
		position: "absolute",
		right: layout.sideMargin,
	},
	back: { left: layout.sideMargin, position: "absolute" },
	halo: { height: MIC, position: "absolute", width: MIC },
	layer: StyleSheet.absoluteFill,
	plate: {
		height: PLATE_BOX,
		justifyContent: "flex-end",
		left: 0,
		position: "absolute",
	},
	// The body has side padding; undo it so everything is placed from the screen edge.
	root: { flex: 1, marginHorizontal: -layout.sideMargin },
	star: { position: "absolute" },
	topBar: {
		alignItems: "center",
		flexDirection: "row",
		gap: layout.gap,
		height: layout.topBarHeight,
		left: layout.sideMargin,
		position: "absolute",
		right: layout.sideMargin,
	},
	words: StyleSheet.absoluteFill,
});
