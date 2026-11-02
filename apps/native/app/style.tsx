import { PrimaryButton } from "@little-adventures/native-ui/button";
import { ClayPressable } from "@little-adventures/native-ui/clay-pressable";
import { ClaySurface } from "@little-adventures/native-ui/clay-surface";
import { ClayText } from "@little-adventures/native-ui/clay-text";
import {
	CheckDisc,
	CompanionTrack,
} from "@little-adventures/native-ui/companion-track";
import { Icon } from "@little-adventures/native-ui/icons";
import { Screen } from "@little-adventures/native-ui/screen";
import { colors, radii, spacing } from "@little-adventures/native-ui/tokens";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
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
import { LIVE_STYLES } from "@/src/data/styles";
import { mark } from "@/src/data/timeline";
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

// Phones shorter than this get the smaller sizes, so nothing scrolls on the smallest phone.
const COMPACT_BELOW = 740;
const sizes = {
	compact: {
		chip: 52,
		gap: spacing.md,
		hero: 92,
		heroPad: 16,
		thumb: 60,
		top: spacing.md,
	},
	tall: {
		chip: 60,
		gap: spacing.lg,
		hero: 120,
		heroPad: 20,
		thumb: 80,
		top: spacing.lg,
	},
} as const;
const CHIP_THUMB = 30;
const CHIP_LOCK = 16;
const CHIP_LOCK_ICON = 10;
const CHIP_LOCK_SHIFT = -3;
const LOCKED_OPACITY = 0.62;
const HERO_DISC = 38;
const HERO_DISC_ICON = 22;
const THUMB_RING = "0px 0px 0px 3px rgba(244,236,216,0.67)";

const youSubtitle = (
	photo: GrownUpPhoto | null | undefined,
	photoUri: string | null
) => {
	if (!photoUri) {
		return "Add your photo";
	}
	return photo?.called?.name ?? "Grown-up";
};

/** A look that is open: one wide card, picked. */
function LookCard({
	compact,
	label,
	onPress,
	picture,
	selected,
}: {
	compact: boolean;
	label: string;
	onPress: () => void;
	picture: number;
	selected: boolean;
}) {
	const size = compact ? sizes.compact : sizes.tall;
	return (
		<ClayPressable
			accessibilityLabel={label}
			accessibilityRole="button"
			onPress={onPress}
			radius={radii.card}
			selected={selected}
			style={[styles.hero, { height: size.hero, paddingLeft: size.heroPad }]}
			tone="sage"
		>
			<View
				style={{
					borderRadius: size.thumb / 2,
					boxShadow: THUMB_RING,
					height: size.thumb,
					overflow: "hidden",
					width: size.thumb,
				}}
			>
				<Image
					accessibilityIgnoresInvertColors
					contentFit="cover"
					source={picture}
					style={{ height: "100%", width: "100%" }}
				/>
			</View>
			<ClayText style={styles.heroLabel} variant="toggleTitle">
				{label}
			</ClayText>
			<CheckDisc icon={HERO_DISC_ICON} on={selected} size={HERO_DISC} />
		</ClayPressable>
	);
}

/** A look that is not open yet: a small dimmed chip with a lock, not pressable. */
function LockedChip({
	compact,
	label,
	picture,
}: {
	compact: boolean;
	label: string;
	picture: number;
}) {
	return (
		<View
			accessibilityLabel={`${label}, coming soon`}
			accessibilityState={{ disabled: true }}
			accessible
			pointerEvents="none"
			style={[
				styles.chip,
				{ height: compact ? sizes.compact.chip : sizes.tall.chip },
			]}
		>
			<ClaySurface
				radius={radii.chip}
				style={StyleSheet.absoluteFill}
				tone="locked"
			/>
			<View style={styles.chipThumb}>
				<Image
					accessibilityIgnoresInvertColors
					contentFit="cover"
					source={picture}
					style={styles.chipPicture}
				/>
				<View style={styles.chipLock}>
					<Icon color={colors.cream} name="lock" size={CHIP_LOCK_ICON} />
				</View>
			</View>
			<ClayText style={styles.chipLabel} variant="label">
				{label}
			</ClayText>
		</View>
	);
}

/** Who comes along: the grown-up or the puppy, exactly one (as on the coming screen). */
function Companion({
	compact,
	profile,
}: {
	compact: boolean;
	profile: Profile;
}) {
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
	let value: "puppy" | "you" | null = null;
	if (profile.grownUp) {
		value = "you";
	} else if (profile.puppy) {
		value = "puppy";
	}

	return (
		<CompanionTrack
			compact={compact}
			onChange={(next) =>
				next === "you"
					? pickYou()
					: saveProfile({ grownUp: false, puppy: true })
			}
			photoUri={photoUri}
			value={value}
			youSubtitle={youSubtitle(photo, photoUri)}
		/>
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
	const go = () => {
		mark("start-tap");
		router.replace({
			params: question ? { question, style: picked } : { style: picked },
			pathname: "/making",
		});
	};
	const start = () => (asksFirst ? setConfirming(true) : go());

	const { height } = useWindowDimensions();
	const compact = height < COMPACT_BELOW;
	const size = compact ? sizes.compact : sizes.tall;

	return (
		<View style={styles.root}>
			<Screen
				bodyFade={false}
				dock={<PrimaryButton label="Start" onPress={start} testID="start" />}
				title="Get ready"
			>
				{/* gap and paddingTop are the minimums; space-evenly shares the leftover height. */}
				<View
					style={[styles.blocks, { gap: size.gap, paddingTop: size.top }]}
					testID="get-ready"
				>
					<View style={styles.section}>
						<ClayText color={colors.cream} style={styles.label} variant="label">
							Style
						</ClayText>
						{looks
							.filter(({ style }) => LIVE_STYLES.includes(style))
							.map(({ label, picture, style }) => (
								<LookCard
									compact={compact}
									key={style}
									label={label}
									onPress={() => setPicked(style)}
									picture={picture}
									selected={picked === style}
								/>
							))}
						<View style={styles.chips}>
							{looks
								.filter(({ style }) => !LIVE_STYLES.includes(style))
								.map(({ label, picture, style }) => (
									<LockedChip
										compact={compact}
										key={style}
										label={label}
										picture={picture}
									/>
								))}
						</View>
					</View>
					<View style={styles.section}>
						<ClayText color={colors.cream} style={styles.label} variant="label">
							{"Who's coming?"}
						</ClayText>
						{child ? (
							<Companion compact={compact} profile={child.profile} />
						) : null}
					</View>
				</View>
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
	blocks: { flex: 1, justifyContent: "space-evenly" },
	chip: {
		alignItems: "center",
		flex: 1,
		flexDirection: "row",
		gap: 7,
		justifyContent: "center",
		opacity: LOCKED_OPACITY,
	},
	chipLabel: { fontSize: 16, lineHeight: 20 },
	chipLock: {
		alignItems: "center",
		backgroundColor: colors.inkNavy,
		borderRadius: CHIP_LOCK / 2,
		bottom: CHIP_LOCK_SHIFT,
		height: CHIP_LOCK,
		justifyContent: "center",
		position: "absolute",
		right: CHIP_LOCK_SHIFT,
		width: CHIP_LOCK,
	},
	chipPicture: {
		borderRadius: CHIP_THUMB / 2,
		height: CHIP_THUMB,
		width: CHIP_THUMB,
	},
	chips: { flexDirection: "row", gap: 8 },
	chipThumb: { height: CHIP_THUMB, width: CHIP_THUMB },
	hero: {
		alignItems: "center",
		flexDirection: "row",
		gap: 16,
		paddingRight: 20,
	},
	heroLabel: { flex: 1 },
	label: { minHeight: 26, opacity: 0.94 },
	root: { flex: 1 },
	section: { gap: 9 },
});
