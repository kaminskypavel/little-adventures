import { BODY_SCROLL_START } from "@little-adventures/native-ui/body-fade";
import { SecondaryButton } from "@little-adventures/native-ui/button";
import { Chip } from "@little-adventures/native-ui/chip";
import { ClayText } from "@little-adventures/native-ui/clay-text";
import { useCalm } from "@little-adventures/native-ui/motion-provider";
import { Placeholder } from "@little-adventures/native-ui/placeholder";
import { QuietLink } from "@little-adventures/native-ui/quiet-link";
import { RowCard } from "@little-adventures/native-ui/row-card";
import { Screen } from "@little-adventures/native-ui/screen";
import {
	clayFaces,
	colors,
	layout,
	listCards,
	motion,
	spacing,
} from "@little-adventures/native-ui/tokens";
import { TopBar } from "@little-adventures/native-ui/top-bar";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { signOut as endSession } from "@/src/auth/auth-client";
import { useSession } from "@/src/auth/use-session";
import { getAdventures } from "@/src/data/adventure-client";
import { grownUpPicture } from "@/src/data/profile-map";
import {
	useChild,
	useDeleteChildPhoto,
	useDeleteGrownUpPhoto,
	useGrownUpPhoto,
} from "@/src/data/profile-queries";
import type { AdventureSummary } from "@/src/data/types";

// 18 Grown-ups. Round 7 (pt = px / 0.72): portrait 92 with a 4 border, name 36,
// sub 19.5, profile row inset 6 more than the cards, "Add a child" beside the Children label.
const PORTRAIT = 92;
const PORTRAIT_BORDER = 4;
const NAME_FONT = 36;
const SUB_FONT = 19.5;
const PROFILE_INSET = 6;
const PROFILE_GAP = 19.5;
const NOW_FONT = 17;
const NOW_DOT = 10;
const NOW_GAP = 8;
const NOW_TOP = 6;
const { choice } = listCards;
const INNER = PORTRAIT - PORTRAIT_BORDER * 2;
// The band is as wide as the circle: off the left edge at the start, off the right at the end.
const sweep = {
	from: { transform: [{ translateX: -1.05 * INNER }] },
	to: { transform: [{ translateX: 2.55 * INNER }] },
};

/** The child's look art; while it is drawn, the Drawing clay with the map's slow shimmer. */
function Avatar({ drawing, url }: { drawing: boolean; url: string | null }) {
	const calm = useCalm();
	if (url) {
		return (
			<Image
				accessibilityIgnoresInvertColors
				contentFit="cover"
				source={url}
				style={styles.portrait}
			/>
		);
	}
	if (!drawing) {
		return <Placeholder icon="user" style={styles.portrait} />;
	}
	return (
		<View style={[styles.portrait, styles.drawing]}>
			<LinearGradient
				colors={clayFaces.drawing}
				style={StyleSheet.absoluteFill}
			/>
			{calm ? null : (
				<Animated.View
					pointerEvents="none"
					style={{
						animationDuration: `${motion.shimmer}ms`,
						animationIterationCount: "infinite",
						animationName: sweep,
						animationTimingFunction: "linear",
						bottom: "-30%",
						position: "absolute",
						top: "-30%",
						width: INNER,
					}}
				>
					<View
						style={{ flex: 1, transform: [{ rotate: choice.shimmerTilt }] }}
					>
						<LinearGradient
							colors={[
								choice.shimmerClear,
								choice.shimmer,
								choice.shimmerClear,
							]}
							end={{ x: 1, y: 0.5 }}
							start={{ x: 0, y: 0.5 }}
							style={StyleSheet.absoluteFill}
						/>
					</View>
				</Animated.View>
			)}
		</View>
	);
}

const subtitle = (a: AdventureSummary) =>
	a.finished
		? `${a.partsDone} of ${a.partsTotal}, ${a.foundCount} things found`
		: `${a.partsDone} of ${a.partsTotal}, in progress`;

export default function Grownups() {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const { user } = useSession();
	const who = user?.name?.trim() || user?.email;
	// The cache asks again while the art is drawn, and after every save (see profile-queries.ts).
	const { data: child } = useChild();
	const profile = child?.profile ?? null;
	const avatarUrl = child?.avatarUrl ?? null;
	const [adventures, setAdventures] = useState<AdventureSummary[] | null>(null);
	const { data: grownUpPhoto } = useGrownUpPhoto();
	const deleteOwnPhoto = useDeleteGrownUpPhoto();
	const deletePhoto = useDeleteChildPhoto();

	useEffect(() => {
		let live = true;
		getAdventures()
			.then((a) => live && setAdventures(a))
			.catch(() => live && setAdventures([]));
		return () => {
			live = false;
		};
	}, []);

	const signOut = async () => {
		await endSession();
		router.replace("/welcome");
	};

	return (
		<Screen
			scrolls
			topBar={
				<TopBar
					action={{
						accessibilityLabel: "Close",
						icon: "x",
						onPress: () => router.back(),
					}}
					title="Grown-ups"
				/>
			}
		>
			<ScrollView
				contentContainerStyle={{
					paddingBottom: insets.bottom + layout.dockBottom,
					paddingTop: BODY_SCROLL_START,
				}}
				showsVerticalScrollIndicator={false}
			>
				{profile && adventures ? (
					<>
						<View style={styles.signed}>
							<ClayText
								color={colors.cream}
								numberOfLines={1}
								style={styles.signedText}
								variant="label"
							>
								{who ? `Signed in as ${who}` : "Signed in"}
							</ClayText>
							<QuietLink label="Sign out" onPress={signOut} />
						</View>
						<View style={styles.childrenRow}>
							<ClayText
								color={colors.cream}
								style={styles.childrenLabel}
								variant="label"
							>
								Children
							</ClayText>
							<SecondaryButton
								icon="plus"
								label="Add a child"
								onPress={() => router.push("/child")}
								size="sm"
								style={styles.add}
							/>
						</View>
						<View style={styles.profile}>
							<Avatar
								drawing={profile.artStatus === "working"}
								url={avatarUrl}
							/>
							<View style={styles.who}>
								<ClayText
									color={colors.cream}
									numberOfLines={1}
									style={{ fontSize: NAME_FONT, lineHeight: NAME_FONT }}
									variant="title"
								>
									{profile.childName}
								</ClayText>
								<ClayText
									color={colors.cream}
									style={styles.age}
									tabular
									variant="body"
								>
									{profile.childAge} years old
								</ClayText>
								{avatarUrl === null && profile.artStatus === "working" ? (
									<View style={styles.now}>
										<View style={styles.dot} />
										<ClayText
											color={colors.cream}
											style={styles.nowText}
											variant="label"
										>
											{`Drawing ${profile.childName}'s look`}
										</ClayText>
									</View>
								) : null}
							</View>
						</View>
						<View style={styles.chips}>
							<Chip
								label="Edit"
								onPress={() => router.push("/child")}
								size="label"
								style={styles.flex}
							/>
							<Chip
								label="Delete photo"
								onPress={deletePhoto}
								size="label"
								style={styles.wide}
							/>
						</View>
						{grownUpPhoto ? (
							<>
								<ClayText
									color={colors.cream}
									style={styles.heading}
									variant="label"
								>
									Your photo
								</ClayText>
								<View style={[styles.profile, styles.own]}>
									<Image
										accessibilityLabel="Your photo"
										contentFit="cover"
										source={grownUpPicture(grownUpPhoto)}
										style={styles.portrait}
									/>
									<View style={styles.ownChips}>
										<Chip
											label="Replace"
											onPress={() => router.push("/grownup-photo?replace=1")}
											size="label"
											style={styles.flex}
										/>
										<Chip
											label="Delete"
											onPress={deleteOwnPhoto}
											size="label"
											style={styles.flex}
										/>
									</View>
								</View>
							</>
						) : null}
						<ClayText
							color={colors.cream}
							style={styles.heading}
							variant="label"
						>
							Adventures
						</ClayText>
						<View style={styles.list}>
							{adventures.map((a) => (
								<RowCard
									key={a.id}
									onPress={() =>
										router.push(
											a.finished ? `/end?id=${a.id}` : `/map?id=${a.id}`
										)
									}
									picture={a.picture}
									subtitle={subtitle(a)}
									title={a.title}
								/>
							))}
						</View>
					</>
				) : null}
			</ScrollView>
		</Screen>
	);
}

const styles = StyleSheet.create({
	add: { alignSelf: "auto", paddingHorizontal: 18 },
	age: { fontSize: SUB_FONT, lineHeight: SUB_FONT * 1.25, opacity: 0.8 },
	childrenLabel: { opacity: 0.85 },
	childrenRow: {
		alignItems: "center",
		flexDirection: "row",
		justifyContent: "space-between",
		marginTop: spacing.sm,
		paddingBottom: spacing.sm,
		paddingLeft: spacing.sm,
	},
	chips: { flexDirection: "row", gap: layout.gapTight, marginTop: spacing.md },
	dot: {
		backgroundColor: colors.sun,
		borderRadius: NOW_DOT / 2,
		height: NOW_DOT,
		width: NOW_DOT,
	},
	drawing: { overflow: "hidden" },
	flex: { flex: 1 },
	heading: {
		marginTop: spacing.lg,
		opacity: 0.85,
		paddingLeft: spacing.sm,
	},
	list: { gap: layout.gap, marginTop: spacing.md },
	now: {
		alignItems: "center",
		flexDirection: "row",
		gap: NOW_GAP,
		marginTop: NOW_TOP,
	},
	nowText: { fontSize: NOW_FONT, lineHeight: NOW_FONT },
	own: { marginTop: spacing.md },
	ownChips: { flex: 1, flexDirection: "row", gap: layout.gapTight },
	portrait: {
		borderColor: colors.sand,
		borderRadius: PORTRAIT / 2,
		borderWidth: PORTRAIT_BORDER,
		height: PORTRAIT,
		width: PORTRAIT,
	},
	profile: {
		alignItems: "center",
		flexDirection: "row",
		gap: PROFILE_GAP,
		paddingHorizontal: PROFILE_INSET,
	},
	signed: {
		alignItems: "center",
		flexDirection: "row",
		gap: spacing.md,
		justifyContent: "space-between",
		paddingLeft: spacing.sm,
	},
	signedText: { flex: 1, opacity: 0.85 },
	who: { flex: 1, gap: 4 },
	wide: { flex: 1.6 },
});
