import { BODY_SCROLL_START } from "@little-adventures/native-ui/body-fade";
import { ClayText } from "@little-adventures/native-ui/clay-text";
import { NamePill } from "@little-adventures/native-ui/name-pill";
import { Screen } from "@little-adventures/native-ui/screen";
import { StoryCover } from "@little-adventures/native-ui/story-cover";
import {
	colors,
	layout,
	spacing,
	storyCover,
} from "@little-adventures/native-ui/tokens";
import { TopBar } from "@little-adventures/native-ui/top-bar";
import { Redirect, useRouter } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { toDemoSummary } from "@/src/data/demo-client";
import { useDemo } from "@/src/data/demo-store";
import { useReplay } from "@/src/data/replay-store";
import { useScreenFade } from "@/src/screen-fade";

const SKELETONS = [0, 1];
const SKELETON_FADE = 0.15;

/** The signed-out demo: two finished adventures, read from public files, no account. */
export default function Demo() {
	const router = useRouter();
	const { leave, veil } = useScreenFade();
	const insets = useSafeAreaInsets();
	const on = useDemo((s) => s.on);
	const entries = useDemo((s) => s.entries);
	const failed = useDemo((s) => s.failed);

	// A reload or a link lands here with the demo off: back to Welcome.
	if (!on) {
		return <Redirect href="/welcome" />;
	}

	const close = () => {
		for (const entry of entries ?? []) {
			useReplay.getState().clear(entry.id);
		}
		useDemo.getState().exit();
		router.replace("/welcome");
	};
	const open = (id: string) => {
		useDemo.getState().open(id);
		leave(() => router.push(`/map?id=${id}`));
	};

	return (
		<>
			<Screen
				scrolls
				topBar={
					<TopBar
						action={{
							accessibilityLabel: "Close the demo",
							icon: "x",
							onPress: close,
						}}
						title="A recorded demo"
					/>
				}
			>
				<ScrollView
					contentContainerStyle={{
						gap: layout.gap,
						paddingBottom: insets.bottom + layout.dockBottom,
						paddingTop: BODY_SCROLL_START,
					}}
					showsVerticalScrollIndicator={false}
				>
					<NamePill
						compact
						style={styles.pill}
						text="Recorded, no account needed"
					/>
					<View style={styles.row}>
						{entries
							? entries.map((entry) => {
									const story = toDemoSummary(entry);
									return (
										<StoryCover
											caption={
												entry.child.name
													? `${entry.child.name}'s story`
													: undefined
											}
											key={entry.id}
											onPress={() => open(entry.id)}
											picture={story.picture}
											size="grid"
											style={styles.cell}
											title={story.title}
										/>
									);
								})
							: SKELETONS.map((n) => <View key={n} style={styles.skeleton} />)}
					</View>
					{failed ? (
						<ClayText align="center" color={colors.cream} variant="body">
							The demo could not be loaded. Check the connection and try again.
						</ClayText>
					) : null}
				</ScrollView>
			</Screen>
			{veil}
		</>
	);
}

const styles = StyleSheet.create({
	cell: { flex: 1 },
	pill: { alignSelf: "center", marginBottom: spacing.sm },
	row: { flexDirection: "row", gap: layout.gap },
	skeleton: {
		backgroundColor: colors.sand,
		borderRadius: storyCover.radius,
		flex: 1,
		height: storyCover.grid.height,
		opacity: SKELETON_FADE,
	},
});
