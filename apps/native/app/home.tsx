import { SecondaryButton } from "@little-adventures/native-ui/button";
import { ClayText } from "@little-adventures/native-ui/clay-text";
import { HeroCard } from "@little-adventures/native-ui/hero-card";
import { Pulse } from "@little-adventures/native-ui/pulse";
import { Screen } from "@little-adventures/native-ui/screen";
import { StoryCover } from "@little-adventures/native-ui/story-cover";
import { StoryShelf } from "@little-adventures/native-ui/story-shelf";
import {
	colors,
	layout,
	motion,
	storyCover,
} from "@little-adventures/native-ui/tokens";
import { TopBar } from "@little-adventures/native-ui/top-bar";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import {
	devFlags,
	getHome,
	getIdeas,
	getProfile,
} from "@/src/data/adventure-client";
import type { Idea } from "@/src/data/types";
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

interface HomeData {
	hasStories: boolean;
	name: string;
}

export default function Home() {
	const router = useRouter();
	const params = useLocalSearchParams<{ first?: string; mic?: string }>();
	// Dev only: production builds ignore the queries.
	const first = dev(params.first);
	const micOff = dev(params.mic) === "off";
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
			// Dev query: /home?first=1 shows the first-home state (no stories yet).
			if (first !== undefined) {
				devFlags.isFirstHome = first === "1";
			}
			Promise.all([getHome(), getProfile()]).then(([home, profile]) => {
				if (live) {
					setData({
						hasStories: home.keepGoing.length + home.finished.length > 0,
						name: profile.childName,
					});
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

	return (
		<Screen
			dock={dock}
			topBar={
				<TopBar
					action={{
						accessibilityLabel: "Grown-ups",
						icon: "lock",
						onPress: () => router.push("/gate"),
					}}
					avatar
					take="wave"
					takeRun={run}
					title={data ? `Hi ${data.name}!` : ""}
				/>
			}
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
			) : (
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
		</Screen>
	);
}

// The dock button shows once we know the child has stories. Same-size flat bar while loading.
function dockFor(data: HomeData | null, onPress: () => void) {
	if (data === null) {
		return <View style={styles.dockSkeleton} />;
	}
	return data.hasStories ? (
		<SecondaryButton label="Continue past stories" onPress={onPress} />
	) : undefined;
}

const styles = StyleSheet.create({
	dockSkeleton: {
		backgroundColor: colors.sand,
		borderRadius: layout.secondaryHeight / 2,
		height: layout.secondaryHeight,
		opacity: SKELETON_FADE,
	},
	label: { marginLeft: LABEL_INSET, marginTop: LABEL_GAP },
	micMsg: {
		fontSize: MIC_MSG_FONT,
		lineHeight: MIC_MSG_LINE,
		marginTop: LABEL_GAP,
	},
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
});
