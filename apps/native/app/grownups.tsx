import { SecondaryButton } from "@little-adventures/native-ui/button";
import { Chip } from "@little-adventures/native-ui/chip";
import { ClayText } from "@little-adventures/native-ui/clay-text";
import { Placeholder } from "@little-adventures/native-ui/placeholder";
import { RowCard } from "@little-adventures/native-ui/row-card";
import { Screen } from "@little-adventures/native-ui/screen";
import { colors, layout, spacing } from "@little-adventures/native-ui/tokens";
import { TopBar } from "@little-adventures/native-ui/top-bar";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { signOut as endSession } from "@/src/auth/auth-client";
import {
	deleteChildPhoto,
	deleteGrownUpPhoto,
	getAdventures,
	getGrownUpPhoto,
	getProfile,
} from "@/src/data/adventure-client";
import type { AdventureSummary, Profile } from "@/src/data/types";

// 18 Grown-ups. Round 7 (pt = px / 0.72): portrait 92 with a 4 border, name 36,
// sub 19.5, profile row inset 6 more than the cards, "Add a child" 42 below the list.
const PORTRAIT = 92;
const PORTRAIT_BORDER = 4;
const NAME_FONT = 36;
const SUB_FONT = 19.5;
const PROFILE_INSET = 6;
const PROFILE_GAP = 19.5;
const ADD_GAP = 42;

const subtitle = (a: AdventureSummary) =>
	a.finished
		? `${a.partsDone} of ${a.partsTotal}, ${a.foundCount} things found`
		: `${a.partsDone} of ${a.partsTotal}, in progress`;

export default function Grownups() {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const [profile, setProfile] = useState<Profile | null>(null);
	const [adventures, setAdventures] = useState<AdventureSummary[] | null>(null);
	const [grownUpPhoto, setGrownUpPhoto] = useState<{
		photoUrl: string;
	} | null>(null);

	useEffect(() => {
		let live = true;
		getProfile().then((p) => live && setProfile(p));
		getAdventures().then((a) => live && setAdventures(a));
		return () => {
			live = false;
		};
	}, []);

	// Read again each time the screen is shown, so a photo just replaced appears.
	useFocusEffect(
		useCallback(() => {
			let live = true;
			getGrownUpPhoto().then((p) => live && setGrownUpPhoto(p));
			return () => {
				live = false;
			};
		}, [])
	);

	const deleteOwnPhoto = async () => {
		await deleteGrownUpPhoto();
		setGrownUpPhoto(null);
	};

	const deletePhoto = async () => {
		setProfile(await deleteChildPhoto());
	};

	const signOut = async () => {
		await endSession();
		router.replace("/welcome");
	};

	return (
		<Screen
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
					paddingTop: spacing.lg,
				}}
				showsVerticalScrollIndicator={false}
			>
				{profile && adventures ? (
					<>
						<View style={styles.profile}>
							<Placeholder icon="user" style={styles.portrait} />
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
								label="Redraw"
								onPress={() => router.push("/look")}
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
										contentFit="cover"
										source={grownUpPhoto.photoUrl}
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
						<View style={styles.actions}>
							<SecondaryButton
								icon="plus"
								label="Add a child"
								onPress={() => router.push("/child")}
							/>
							<SecondaryButton label="Sign out" onPress={signOut} />
						</View>
					</>
				) : null}
			</ScrollView>
		</Screen>
	);
}

const styles = StyleSheet.create({
	actions: { gap: layout.gap, marginTop: ADD_GAP },
	age: { fontSize: SUB_FONT, lineHeight: SUB_FONT * 1.25, opacity: 0.8 },
	chips: { flexDirection: "row", gap: layout.gapTight, marginTop: spacing.md },
	flex: { flex: 1 },
	heading: {
		marginTop: spacing.lg,
		opacity: 0.85,
		paddingLeft: spacing.sm,
	},
	list: { gap: layout.gap, marginTop: spacing.md },
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
	who: { flex: 1, gap: 4 },
	wide: { flex: 1.6 },
});
