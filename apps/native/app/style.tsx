import {
	BODY_SCROLL_END,
	BODY_SCROLL_START,
} from "@little-adventures/native-ui/body-fade";
import { PrimaryButton } from "@little-adventures/native-ui/button";
import { ClayText } from "@little-adventures/native-ui/clay-text";
import { LookTile } from "@little-adventures/native-ui/look-tile";
import { Screen } from "@little-adventures/native-ui/screen";
import { ToggleCard } from "@little-adventures/native-ui/toggle-card";
import { colors, select } from "@little-adventures/native-ui/tokens";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { VideoConfirm } from "@/src/admin/live-confirm";
import { isAdminMe } from "@/src/admin/use-is-admin";
import { useMe } from "@/src/admin/use-me";
import type { Style } from "@/src/data/engine-client";
import { setStepsOptions } from "@/src/data/engine-queries";
import { type GrownUpPhoto, grownUpPicture } from "@/src/data/profile-map";
import {
	grownUpOptions,
	useChild,
	useGrownUpPhoto,
	useSaveProfile,
} from "@/src/data/profile-queries";
import type { Profile } from "@/src/data/types";

const looks: { label: string; picture: number; style: Style }[] = [
	{
		label: "3D movie",
		picture: require("../assets/styles/animated.jpg"),
		style: "animated",
	},
	{
		label: "Clay",
		picture: require("../assets/styles/clay.jpg"),
		style: "clay",
	},
	{
		label: "Felt",
		picture: require("../assets/styles/felt.jpg"),
		style: "felt",
	},
	{
		label: "Wood",
		picture: require("../assets/styles/wood.jpg"),
		style: "wood",
	},
];

const subtitle = (
	photo: GrownUpPhoto | null | undefined,
	photoUri: string | null
) => {
	if (!photoUri) {
		return "Tap the circle to add a photo";
	}
	return photo?.called?.name ?? "Tap your photo to change";
};

/** Who comes along: the grown-up or the puppy, exactly one (as on the coming screen). */
function Companion({ profile }: { profile: Profile }) {
	const router = useRouter();
	const client = useQueryClient();
	const saveProfile = useSaveProfile();
	// A photo just replaced shows on return.
	const { data: photo } = useGrownUpPhoto();
	const photoUri = photo ? grownUpPicture(photo) : null;

	const pickYou = async () => {
		// The photo is mandatory for You: without one, the photo step saves the choice.
		if (await client.fetchQuery(grownUpOptions())) {
			await saveProfile({ grownUp: true, puppy: false });
		} else {
			router.push("/grownup-photo");
		}
	};

	return (
		<>
			<ToggleCard
				avatar="you"
				on={profile.grownUp}
				onPress={pickYou}
				photo={{
					label: photoUri ? "Change your photo" : "Add your photo",
					onPress: () =>
						router.push({
							params: { replace: "1" },
							pathname: "/grownup-photo",
						}),
					uri: photoUri,
				}}
				subtitle={subtitle(photo, photoUri)}
				title="You"
			/>
			<ToggleCard
				avatar="puppy"
				on={profile.puppy && !profile.grownUp}
				onPress={() => saveProfile({ grownUp: false, puppy: true })}
				subtitle="Best friend"
				title="Puppy"
			/>
		</>
	);
}

/** Before an adventure starts: how should it be drawn. Reached from the check screen and Home's ideas. */
export default function StylePicker() {
	const router = useRouter();
	// An idea from Home brings its question; the child's own words wait on the device.
	const { question } = useLocalSearchParams<{ question?: string }>();
	const me = useMe();
	const client = useQueryClient();
	const steps = useMutation(setStepsOptions(client));
	const [picked, setPicked] = useState<Style>("animated");
	const [confirming, setConfirming] = useState(false);
	// Video is the costly step: an admin with video clips on chooses first.
	const { data: child } = useChild();
	const asksFirst = isAdminMe(me) && me?.steps.video === true;
	const go = () =>
		router.replace({
			params: question ? { question, style: picked } : { style: picked },
			pathname: "/making",
		});
	const start = () => (asksFirst ? setConfirming(true) : go());

	return (
		<View style={styles.root}>
			<Screen
				dock={<PrimaryButton label="Start" onPress={start} />}
				scrolls
				title="Get ready"
			>
				<ScrollView
					contentContainerStyle={styles.content}
					showsVerticalScrollIndicator={false}
				>
					<ClayText color={colors.cream} style={styles.label} variant="label">
						Style
					</ClayText>
					<View style={styles.row}>
						{looks.map(({ label, picture, style }) => (
							<LookTile
								key={style}
								label={label}
								onPress={() => setPicked(style)}
								picture={picture}
								selected={picked === style}
								style={styles.tile}
							/>
						))}
					</View>
					<ClayText color={colors.cream} style={styles.label} variant="label">
						{"Who's coming?"}
					</ClayText>
					{child ? <Companion profile={child.profile} /> : null}
				</ScrollView>
			</Screen>
			{confirming ? (
				<VideoConfirm
					onCancel={() => setConfirming(false)}
					// The engine reads the switches when the adventure starts, so wait for the save.
					onNoVideo={() => steps.mutate({ video: false }, { onSuccess: go })}
					onVideo={go}
				/>
			) : null}
		</View>
	);
}

const styles = StyleSheet.create({
	// Bottom padding lets the last card scroll clear of the dock fade.
	content: {
		gap: 12,
		paddingBottom: BODY_SCROLL_END,
		paddingTop: BODY_SCROLL_START,
	},
	label: { marginTop: 6, opacity: 0.92 },
	root: { flex: 1 },
	row: { flexDirection: "row", flexWrap: "wrap", gap: select.lookRowGap },
	// Two across: 45% each wraps the third tile, and grow fills the row.
	tile: { flexBasis: "45%", flexGrow: 1 },
});
