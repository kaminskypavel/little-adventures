import { ClayText } from "@little-adventures/native-ui/clay-text";
import { HeroCard } from "@little-adventures/native-ui/hero-card";
import { ListRow } from "@little-adventures/native-ui/list-row";
import { RowCard } from "@little-adventures/native-ui/row-card";
import { Screen } from "@little-adventures/native-ui/screen";
import { StarTake } from "@little-adventures/native-ui/star-take";
import { colors, layout, listCards } from "@little-adventures/native-ui/tokens";
import { TopBar } from "@little-adventures/native-ui/top-bar";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import { devFlags, getHome, getProfile } from "@/src/data/adventure-client";
import type { AdventureSummary } from "@/src/data/types";
import { dev } from "@/src/dev-param";

// Round 7 spacing (px / 0.72), measured from the bottom of the top bar.
const HERO_GAP = 31;
const HERO_HEIGHT = 178;
const HERO_FIRST_GAP = 34;
const HERO_FIRST_HEIGHT = 208;
const HEADING_GAP = 38;
const FINISHED_GAP = 50;
const ROWS_GAP = 17;
const HEADING_INSET = 6;
const STAR_GAP = 81;
const STAR_SIZE = 180;
const FIRST_LINE_GAP = 32;
const MAX_ROWS = 2;

interface HomeData {
	finished: AdventureSummary[];
	keepGoing: AdventureSummary[];
	name: string;
}

export default function Home() {
	const router = useRouter();
	const params = useLocalSearchParams<{ first?: string }>();
	// Dev only: production builds ignore the query.
	const first = dev(params.first);
	const [data, setData] = useState<HomeData | null>(null);

	useFocusEffect(
		useCallback(() => {
			let live = true;
			// Dev query: /home?first=1 shows the first-home state.
			if (first !== undefined) {
				devFlags.isFirstHome = first === "1";
			}
			Promise.all([getHome(), getProfile()]).then(([home, profile]) => {
				if (live) {
					setData({
						finished: home.finished,
						keepGoing: home.keepGoing,
						name: profile.childName,
					});
				}
			});
			return () => {
				live = false;
			};
		}, [first])
	);

	const isFirst =
		data !== null && data.keepGoing.length === 0 && data.finished.length === 0;

	return (
		<Screen
			topBar={
				<TopBar
					action={{
						accessibilityLabel: "Grown-ups",
						icon: "lock",
						onPress: () => router.push("/gate"),
					}}
					avatar
					title={data ? `Hi ${data.name}!` : ""}
				/>
			}
		>
			{isFirst ? (
				<FirstHome onNew={() => router.push("/pick")} />
			) : (
				<View style={{ marginTop: HERO_GAP }}>
					<HeroCard
						height={HERO_HEIGHT}
						label={"New\nadventure"}
						onPress={() => router.push("/pick")}
					/>
					{data ? (
						<Lists
							finished={data.finished}
							keepGoing={data.keepGoing}
							onFinished={() => router.push("/end?id=moon-done")}
							onKeepGoing={(id) => router.push(`/map?id=${id}`)}
						/>
					) : (
						<LoadingLists />
					)}
				</View>
			)}
		</Screen>
	);
}

function Lists({
	finished,
	keepGoing,
	onFinished,
	onKeepGoing,
}: {
	finished: AdventureSummary[];
	keepGoing: AdventureSummary[];
	onFinished: () => void;
	onKeepGoing: (id: string) => void;
}) {
	return (
		<>
			{keepGoing.length > 0 ? (
				<>
					<Heading />
					<View style={styles.rows}>
						{keepGoing.slice(0, MAX_ROWS).map((a) => (
							<ListRow
								caption={`${a.partsDone} of ${a.partsTotal} places`}
								key={a.id}
								onPress={() => onKeepGoing(a.id)}
								picture={a.picture}
								title={a.title}
							/>
						))}
					</View>
				</>
			) : null}
			{finished.length > 0 ? (
				<RowCard
					count={String(finished.length)}
					onPress={onFinished}
					picture={finished[0].picture}
					style={{
						marginTop: keepGoing.length > 0 ? FINISHED_GAP : HEADING_GAP,
					}}
					title="Finished"
				/>
			) : null}
		</>
	);
}

function Heading() {
	return (
		<ClayText
			accessibilityRole="header"
			color={colors.cream}
			style={styles.heading}
			variant="title"
		>
			Keep going
		</ClayText>
	);
}

// Same-size flat rows while the lists load. Never a spinner.
function LoadingLists() {
	return (
		<>
			<Heading />
			<View style={styles.rows}>
				<View style={styles.skeleton} />
				<View style={styles.skeleton} />
			</View>
			<View style={[styles.skeleton, { marginTop: FINISHED_GAP }]} />
		</>
	);
}

// E4: both lists empty. One big card, the star, one friendly line.
function FirstHome({ onNew }: { onNew: () => void }) {
	return (
		<View style={{ marginTop: HERO_FIRST_GAP }}>
			<HeroCard
				height={HERO_FIRST_HEIGHT}
				label={"New\nadventure"}
				onPress={onNew}
			/>
			<View style={styles.star}>
				<StarTake size={STAR_SIZE} take="idle" />
			</View>
			<ClayText
				align="center"
				color={colors.cream}
				style={styles.firstLine}
				variant="body"
			>
				Your adventures will live here
			</ClayText>
		</View>
	);
}

const styles = StyleSheet.create({
	firstLine: { fontSize: 21, lineHeight: 26, marginTop: FIRST_LINE_GAP },
	heading: {
		fontSize: 28,
		lineHeight: 34,
		marginTop: HEADING_GAP,
		paddingLeft: HEADING_INSET,
	},
	rows: { gap: layout.gap, marginTop: ROWS_GAP },
	skeleton: {
		backgroundColor: colors.sand,
		borderRadius: listCards.list.radius,
		height: listCards.list.height,
		opacity: 0.15,
	},
	star: {
		alignSelf: "center",
		height: STAR_SIZE,
		marginTop: STAR_GAP,
		width: STAR_SIZE,
	},
});
