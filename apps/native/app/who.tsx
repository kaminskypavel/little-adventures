import { SecondaryButton } from "@little-adventures/native-ui/button";
import { ClayText } from "@little-adventures/native-ui/clay-text";
import { EditBadge } from "@little-adventures/native-ui/edit-badge";
import { IconButton } from "@little-adventures/native-ui/icon-button";
import { Placeholder } from "@little-adventures/native-ui/placeholder";
import { Swoosh } from "@little-adventures/native-ui/swoosh";
import {
	colors,
	flat,
	layout,
	motion,
} from "@little-adventures/native-ui/tokens";
import { selectionAsync } from "expo-haptics";
import { Image } from "expo-image";
import { usePreventRemove, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import {
	useSafeAreaFrame,
	useSafeAreaInsets,
} from "react-native-safe-area-context";
import { showNeedsAccount } from "@/src/auth/needs-account";
import { useIsGuest } from "@/src/auth/use-session";
import { setCurrentChildId } from "@/src/data/current-child";
import { useChild, useChildren } from "@/src/data/profile-queries";
import { useT } from "@/src/i18n";
import { whoStrings } from "@/src/i18n/strings/who";

const FACE = 140;
const FACE_GAP = 34;
const SIDE = 24;
// The design frame is 390 x 844: the title sits 236 pt from the top, the faces 94 pt below it.
const FRAME_HEIGHT = 844;
const TITLE_TOP = 236;
const TITLE_TO_FACES = 94;
const TITLE_LINE = 34;
const RING = "0px 0px 0px 5px rgba(255,200,61,0.3)";
// "Add a child" sits 70 pt under the faces' names.
const FACES_TO_ADD = 70;
const BADGE = flat.editBadge;
// The pencil's own box (with its inset) at the face's bottom right; the slop makes it a 64 pt target.
const BADGE_BOX = BADGE.size + BADGE.inset;
const BADGE_SLOP = (layout.minTarget - BADGE_BOX) / 2;

/**
 * Leaving the screen plays the swoosh out first. Every way out (the X, a face, the back gesture
 * or button) is a pop, so it is held here: the layers sink, then the pop goes on.
 */
function useSwooshLeave() {
	const [leaving, setLeaving] = useState(false);
	const [released, setReleased] = useState(false);
	const repeat = useRef<() => void>(() => undefined);
	usePreventRemove(!released, (event) => {
		repeat.current = event.repeat;
		setLeaving(true);
	});
	const onLeft = useCallback(() => {
		setReleased(true);
		repeat.current();
	}, []);
	return { leaving, onLeft };
}

/**
 * "Who's listening?": a full screen over the app's sky. Tap a face to switch the current child; the
 * pencil on a face opens that child's edit screen, and "Add a child" sits under the faces.
 */
export default function Who() {
	const router = useRouter();
	const t = useT(whoStrings);
	// A guest looks, but adding or editing a child needs an account.
	const guest = useIsGuest();
	const { leaving, onLeft } = useSwooshLeave();
	const insets = useSafeAreaInsets();
	const { height, width } = useSafeAreaFrame();
	const children = useChildren();
	const currentId = useChild().data?.id;
	// One row: with three or more children the faces shrink so the row still fits across.
	const count = Math.max(1, children?.length ?? 1);
	const face = Math.min(
		FACE,
		(width - SIDE * 2 - FACE_GAP * (count - 1)) / count
	);
	// Scaled to the screen, but never up under the close button.
	const titleTop = Math.max(
		(TITLE_TOP / FRAME_HEIGHT) * height,
		insets.top + layout.topBarOffset + layout.topBarHeight + 16
	);

	const onFace = (id: string) => {
		selectionAsync();
		if (id !== currentId) {
			setCurrentChildId(id);
		}
		router.back();
	};

	return (
		<View style={styles.root}>
			<View
				pointerEvents="box-none"
				style={[
					styles.close,
					{ right: layout.sideMargin, top: insets.top + layout.topBarOffset },
				]}
			>
				<IconButton
					accessibilityLabel={t("close")}
					icon="x"
					onPress={() => router.back()}
				/>
			</View>
			<Swoosh leaving={leaving} onLeft={onLeft} style={{ marginTop: titleTop }}>
				<ClayText
					accessibilityRole="header"
					align="center"
					color={colors.cream}
					style={styles.title}
					variant="headline"
				>
					{t("listening")}
				</ClayText>
			</Swoosh>
			<Swoosh index={1} leaving={leaving} style={styles.faces}>
				{children?.map((child) => (
					<Pressable
						accessibilityLabel={child.name}
						accessibilityRole="button"
						accessibilityState={{ selected: child.id === currentId }}
						key={child.id}
						onPress={() => onFace(child.id)}
						style={({ pressed }) => [
							styles.face,
							{ width: face },
							pressed && { transform: [{ scale: motion.pressScale }] },
						]}
					>
						{/* The badge sits beside the clipped circle, not inside it, so the round crop never cuts it. */}
						<View style={{ height: face, width: face }}>
							<View
								style={[
									styles.circle,
									{ borderRadius: face / 2, height: face, width: face },
									child.id === currentId && styles.on,
								]}
							>
								{child.avatar ? (
									<Image
										accessibilityIgnoresInvertColors
										cachePolicy="memory-disk"
										contentFit="cover"
										source={child.avatar}
										style={StyleSheet.absoluteFill}
									/>
								) : (
									<Placeholder icon="user" style={StyleSheet.absoluteFill} />
								)}
							</View>
							<Pressable
								accessibilityLabel={t("edit", { name: child.name })}
								accessibilityRole="button"
								hitSlop={BADGE_SLOP}
								onPress={() => {
									selectionAsync();
									if (guest) {
										showNeedsAccount();
										return;
									}
									router.push(`/child-edit?id=${child.id}`);
								}}
								style={styles.badge}
							>
								<EditBadge />
							</Pressable>
						</View>
						<ClayText
							adjustsFontSizeToFit
							align="center"
							color={colors.cream}
							minimumFontScale={0.6}
							numberOfLines={1}
							style={[styles.name, { width: face + FACE_GAP - 8 }]}
							variant="headline"
						>
							{child.name}
						</ClayText>
					</Pressable>
				))}
			</Swoosh>
			<Swoosh index={2} leaving={leaving} style={styles.slot}>
				<SecondaryButton
					icon="plus"
					label={t("addChild")}
					onPress={() =>
						guest ? showNeedsAccount() : router.push("/child?new=1")
					}
					size="sm"
					style={styles.add}
				/>
			</Swoosh>
		</View>
	);
}

const styles = StyleSheet.create({
	add: { alignSelf: "center", paddingLeft: 14, paddingRight: 18 },
	badge: {
		bottom: 0,
		height: BADGE_BOX,
		position: "absolute",
		right: 0,
		width: BADGE_BOX,
	},
	circle: { borderColor: colors.sand, borderWidth: 4, overflow: "hidden" },
	close: { position: "absolute", zIndex: 1 },
	face: { alignItems: "center", gap: 12, minWidth: layout.minTarget },
	faces: {
		alignItems: "flex-start",
		flexDirection: "row",
		gap: FACE_GAP,
		justifyContent: "center",
		// Title line to the faces' top, 94 pt on the design frame.
		marginTop: TITLE_TO_FACES - TITLE_LINE,
		// Room for the sun ring, which paints outside the circle.
		paddingHorizontal: SIDE,
	},
	name: { fontSize: 24, lineHeight: 28 },
	on: { borderColor: colors.sun, boxShadow: RING },
	root: { flex: 1 },
	slot: { marginTop: FACES_TO_ADD },
	title: { fontSize: 31, lineHeight: TITLE_LINE },
});
