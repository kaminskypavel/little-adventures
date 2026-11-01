import { SecondaryButton } from "@little-adventures/native-ui/button";
import { ClayText } from "@little-adventures/native-ui/clay-text";
import { HeroCard } from "@little-adventures/native-ui/hero-card";
import { Pulse } from "@little-adventures/native-ui/pulse";
import { RowCard } from "@little-adventures/native-ui/row-card";
import { Screen } from "@little-adventures/native-ui/screen";
import { StoryCover } from "@little-adventures/native-ui/story-cover";
import { StoryShelf } from "@little-adventures/native-ui/story-shelf";
import {
	colors,
	layout,
	motion,
	spacing,
	storyCover,
} from "@little-adventures/native-ui/tokens";
import { TopBar } from "@little-adventures/native-ui/top-bar";
import MaskedView from "@react-native-masked-view/masked-view";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	Platform,
	ScrollView,
	StyleSheet,
	View,
	type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
	devFlags,
	getAvatarUrl,
	getIdeas,
	getLatestAdventure,
	getProfile,
} from "@/src/data/adventure-client";
import { micPermission } from "@/src/data/mic-permission";
import type { AdventureSummary, Idea } from "@/src/data/types";
import { dev } from "@/src/dev-param";

// Mockup B2 (390 x 844 phone, px = pt), measured as gaps between pieces.
const TITLE_GAP = 8;
const TITLE_SIZE = 33;
const TITLE_LINE = 36;
const TITLE_LINES = 2;
const HERO_GAP = 17;
const HERO_HEIGHT = 140;
const LABEL_GAP = 16;
const LABEL_INSET = 4;
const SHELF_GAP = 9;
const MIC_MSG_FONT = 22;
const MIC_MSG_LINE = 28;
// The Ask your own card pulses once, after the avatar star has waved.
const HERO_PULSE_DELAY = motion.pulseOffset + 200;
const SKELETON_FADE = 0.15;
// Soft fade under the avatar and lock: content is gone above the bar's bottom edge and clear this
// far below it. The fade turns on over the first FADE_ON_SCROLL pt of scroll, so Home at rest is
// untouched.
const FADE_BAND = 52;
const FADE_ON_SCROLL = 24;
const IS_WEB = Platform.OS === "web";

// A fixed mask over the scroll view: transparent at `gone`, solid at `gone + FADE_BAND`; `on` (0 to 1)
// is how far the fade has turned on. Web uses a CSS mask.
function fadeMask(gone: number, on: number): ViewStyle | undefined {
	if (on <= 0) {
		return undefined;
	}
	const top = `rgba(0,0,0,${(1 - on).toFixed(3)})`;
	return {
		maskImage: `linear-gradient(to bottom, ${top} ${gone}px, #000 ${gone + FADE_BAND}px)`,
	} as ViewStyle;
}

// The same mask for iOS and Android (MaskedView reads only its alpha): `top` alpha down to the bar's
// bottom edge, a FADE_BAND ramp to solid, then solid. Fixed-height pieces, so no layout pass.
function NativeFadeMask({ gone, on }: { gone: number; on: number }) {
	const top = `rgba(0,0,0,${(1 - on).toFixed(3)})` as const;
	return (
		<View style={styles.maskFill}>
			<View style={{ backgroundColor: top, height: gone }} />
			<LinearGradient colors={[top, "#000"]} style={{ height: FADE_BAND }} />
			<View style={styles.maskSolid} />
		</View>
	);
}

interface HomeData {
	avatarUrl: string | null;
	/** The adventure made last; null when the child has none yet. */
	latest: AdventureSummary | null;
	name: string;
}

export default function Home() {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	// Bottom edge of the avatar and lock row, from the screen top (119 pt on a 47 pt inset).
	const barBottom = insets.top + layout.topBarOffset + layout.topBarHeight;
	const [scrolled, setScrolled] = useState(0);
	const params = useLocalSearchParams<{ first?: string; mic?: string }>();
	// Dev only: production builds ignore the queries.
	const first = dev(params.first);
	// Denied in the phone's settings: the Ask your own card goes off. Read on every focus, so a
	// grown-up who turns it on in settings finds it on when they come back.
	const [micDenied, setMicDenied] = useState(false);
	// Android is not a launch target and has no WAV recorder, so its mic is off too.
	const micOff =
		dev(params.mic) === "off" || micDenied || Platform.OS === "android";
	const [data, setData] = useState<HomeData | null>(null);
	const [ideas, setIdeas] = useState<Idea[] | null>(null);

	// Counts focuses: each one waves the avatar star again and pulses the Ask your own card.
	// The first focus is the mount, which already plays both.
	const [run, setRun] = useState(0);
	const seenFocus = useRef(false);
	useFocusEffect(
		useCallback(() => {
			if (seenFocus.current) {
				setRun((n) => n + 1);
			}
			seenFocus.current = true;
		}, [])
	);

	useFocusEffect(
		useCallback(() => {
			let live = true;
			micPermission()
				.then((status) => live && setMicDenied(status === "denied"))
				.catch(() => undefined);
			return () => {
				live = false;
			};
		}, [])
	);

	useFocusEffect(
		useCallback(() => {
			let live = true;
			// Dev query: /home?first=1 shows the first-home state (no stories yet).
			if (first !== undefined) {
				devFlags.isFirstHome = first === "1";
			}
			// A story list or picture that cannot be read shows as none, never as a skeleton for ever.
			Promise.all([
				getLatestAdventure().catch(() => null),
				getAvatarUrl().catch(() => null),
				getProfile(),
			]).then(([newest, avatarUrl, profile]) => {
				if (live) {
					setData({ avatarUrl, latest: newest, name: profile.childName });
				}
			});
			return () => {
				live = false;
			};
		}, [first])
	);

	useEffect(() => {
		let live = true;
		getIdeas().then((list) => live && setIdeas(list));
		return () => {
			live = false;
		};
	}, []);

	const ask = (question: string) =>
		router.push({ params: { question }, pathname: "/making" });

	const dock = dockFor(data, () => router.push("/library"));
	const latest = data?.latest ?? null;

	const scroll = (
		<ScrollView
			contentContainerStyle={[
				styles.content,
				{ paddingTop: barBottom + spacing.lg },
			]}
			onScroll={(e) =>
				setScrolled(
					Math.round(Math.min(FADE_ON_SCROLL, e.nativeEvent.contentOffset.y))
				)
			}
			scrollEventThrottle={16}
			showsVerticalScrollIndicator={false}
			style={[
				styles.scroll,
				IS_WEB
					? fadeMask(barBottom, scrolled / FADE_ON_SCROLL)
					: { marginTop: barBottom },
			]}
		>
			<ClayText
				accessibilityRole="header"
				align="center"
				color={colors.cream}
				numberOfLines={TITLE_LINES}
				style={styles.title}
				variant="headline"
			>
				{data ? `What shall we explore, ${data.name}?` : ""}
			</ClayText>
			<View style={{ marginTop: HERO_GAP }}>
				<Pulse delay={HERO_PULSE_DELAY} play={run}>
					{micOff ? (
						<HeroCard height={HERO_HEIGHT} label={"Mic is\noff"} off />
					) : (
						<HeroCard
							height={HERO_HEIGHT}
							label={"Ask\nyour own"}
							onPress={() => router.push("/listening")}
						/>
					)}
				</Pulse>
			</View>
			{micOff ? (
				<ClayText
					align="center"
					color={colors.cream}
					style={styles.micMsg}
					variant="label"
				>
					Ask a grown-up to turn it on.
				</ClayText>
			) : null}
			{latest ? (
				<>
					<ClayText color={colors.cream} style={styles.label} variant="label">
						Keep exploring
					</ClayText>
					<RowCard
						onPress={() => router.push(`/map?id=${latest.id}`)}
						picture={latest.picture}
						style={styles.latest}
						subtitle={
							latest.finished
								? "Finished"
								: `${latest.partsDone} of ${latest.partsTotal} places`
						}
						title={latest.title}
					/>
				</>
			) : null}
			{micOff && !latest ? null : (
				<ClayText color={colors.cream} style={styles.label} variant="label">
					Or try an idea
				</ClayText>
			)}
			<StoryShelf style={styles.shelf}>
				{ideas
					? ideas.map((idea) => (
							<StoryCover
								key={idea.question}
								onPress={() => ask(idea.question)}
								picture={idea.picture}
								size="shelf"
								title={idea.question}
							/>
						))
					: [0, 1, 2].map((n) => <View key={n} style={styles.skeleton} />)}
			</StoryShelf>
		</ScrollView>
	);

	return (
		<Screen dock={dock}>
			{IS_WEB ? (
				scroll
			) : (
				<MaskedView
					androidRenderingMode="software"
					maskElement={
						<NativeFadeMask gone={barBottom} on={scrolled / FADE_ON_SCROLL} />
					}
					style={styles.scroll}
				>
					{scroll}
				</MaskedView>
			)}
			{/* No bar behind them: the avatar and lock float on the sky, over the scroll area. */}
			<View
				pointerEvents="box-none"
				style={[styles.topBar, { top: insets.top + layout.topBarOffset }]}
			>
				<TopBar
					action={{
						accessibilityLabel: "Grown-ups",
						icon: "lock",
						onPress: () => router.push("/gate"),
					}}
					avatar={data !== null}
					avatarUrl={data?.avatarUrl}
					take="wave"
					takeRun={run}
					title={data ? `Hi ${data.name}!` : ""}
				/>
			</View>
		</Screen>
	);
}

// The dock button shows once we know the child has stories. Same-size flat bar while loading.
function dockFor(data: HomeData | null, onPress: () => void) {
	if (data === null) {
		return <View style={styles.dockSkeleton} />;
	}
	return data.latest ? (
		<SecondaryButton label="Continue past stories" onPress={onPress} />
	) : undefined;
}

const styles = StyleSheet.create({
	// The body has side padding; the scroll view undoes it so the shelf can bleed to the edge.
	content: { paddingBottom: spacing.sm, paddingHorizontal: layout.sideMargin },
	dockSkeleton: {
		backgroundColor: colors.sand,
		borderRadius: layout.secondaryHeight / 2,
		height: layout.secondaryHeight,
		opacity: SKELETON_FADE,
	},
	fill: { flex: 1 },
	label: { marginLeft: LABEL_INSET, marginTop: LABEL_GAP },
	latest: { marginTop: SHELF_GAP },
	maskFill: { backgroundColor: "transparent", flex: 1 },
	maskSolid: { backgroundColor: "#000", flex: 1 },
	micMsg: {
		fontSize: MIC_MSG_FONT,
		lineHeight: MIC_MSG_LINE,
		marginTop: LABEL_GAP,
	},
	scroll: { flex: 1, marginHorizontal: -layout.sideMargin },
	shelf: { marginTop: SHELF_GAP },
	skeleton: {
		backgroundColor: colors.sand,
		borderRadius: storyCover.radius,
		height: storyCover.shelf.height,
		opacity: SKELETON_FADE,
		width: storyCover.shelf.width,
	},
	title: {
		fontSize: TITLE_SIZE,
		lineHeight: TITLE_LINE,
		marginTop: TITLE_GAP,
		minHeight: TITLE_LINE * TITLE_LINES,
	},
	// Same row as Screen's top bar, drawn over the scroll area (the body adds the side margins).
	topBar: {
		alignItems: "center",
		flexDirection: "row",
		gap: layout.gap,
		height: layout.topBarHeight,
		left: 0,
		position: "absolute",
		right: 0,
	},
});
