import { ClayPressable } from "@little-adventures/native-ui/clay-pressable";
import { Icon } from "@little-adventures/native-ui/icons";
import {
	colors,
	fonts,
	layout,
	motion,
	radii,
} from "@little-adventures/native-ui/tokens";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
	Easing,
	FadeOut,
	useAnimatedStyle,
	useDerivedValue,
	withTiming,
} from "react-native-reanimated";
import { CastIcon } from "@/src/cast/cast-icon";
import { TvHit } from "@/src/cast/tv-hit";
import { useCastAvailable, useCastConnected } from "@/src/cast/use-cast";
import { useMusic } from "@/src/data/music-store";
import { usePlayerPrefs } from "@/src/data/player-prefs";
import { useReplay } from "@/src/data/replay-store";
import { leaveActive } from "@/src/screen-fade";

// The one menu of the sideways adventure, a burger at the top right of the map and of the place
// player. It holds what a grown-up may want while the child plays: music, captions, the TV and
// the way to the grown-ups' area. What it keeps (music, captions) is kept for every screen.
const MENU_BUTTON = layout.minTarget;
const MENU_WIDTH = 232;
const ROW_HEIGHT = 48;
const ROW_TEXT = 16;
const TRACK_TINT = "rgba(244,236,216,0.2)";
const BAR_WIDTH = 20;
const BAR_HEIGHT = 3;
const BAR_GAP = 4;
const SWITCH_WIDTH = 52;
const SWITCH_HEIGHT = 30;
const THUMB = 24;
const THUMB_INSET = 3;
const MENU_GAP = 8;
const MENU_FROM_SCALE = 0.92;
const TV_ICON = 20;
const LOCK_ICON = 22;

function MenuGlyph() {
	return (
		<View pointerEvents="none" style={{ gap: BAR_GAP }}>
			{[0, 1, 2].map((bar) => (
				<View
					key={bar}
					style={{
						backgroundColor: colors.inkNavy,
						borderRadius: BAR_HEIGHT,
						height: BAR_HEIGHT,
						width: BAR_WIDTH,
					}}
				/>
			))}
		</View>
	);
}

function closeMenu() {
	usePlayerPrefs.getState().setMenuOpen(false);
}

function toggleMenu() {
	const { menuOpen, setMenuOpen } = usePlayerPrefs.getState();
	if (menuOpen) {
		closeMenu();
		return;
	}
	setMenuOpen(true);
}

const menuEntering = () => {
	"worklet";
	const timing = {
		duration: motion.select,
		easing: Easing.bezier(...motion.easeOut),
	};
	return {
		animations: {
			opacity: withTiming(1, timing),
			transform: [{ scale: withTiming(1, timing) }],
		},
		initialValues: {
			opacity: 0,
			transform: [{ scale: MENU_FROM_SCALE }],
		},
	};
};

/** A small clay switch: sun when on, a dim track when off, the thumb slides across. */
function Switch({ on }: { on: boolean }) {
	const slide = useDerivedValue(() =>
		withTiming(on ? 1 : 0, { duration: motion.select })
	);
	const thumb = useAnimatedStyle(() => ({
		transform: [
			{
				translateX: slide.get() * (SWITCH_WIDTH - THUMB - THUMB_INSET * 2),
			},
		],
	}));
	return (
		<View
			pointerEvents="none"
			style={[
				styles.switchTrack,
				{ backgroundColor: on ? colors.sun : TRACK_TINT },
			]}
		>
			<Animated.View
				style={[
					styles.thumb,
					{ backgroundColor: on ? colors.inkNavy : colors.cream },
					thumb,
				]}
			/>
		</View>
	);
}

function Row({
	children,
	label,
	onPress,
	role,
	checked,
}: {
	checked?: boolean;
	/** What sits at the right end of the row. */
	children: ReactNode;
	label: string;
	onPress: () => void;
	role: "button" | "switch";
}) {
	return (
		<Pressable
			accessibilityLabel={label}
			accessibilityRole={role}
			accessibilityState={checked === undefined ? undefined : { checked }}
			onPress={onPress}
			style={styles.row}
		>
			<Text allowFontScaling={false} style={styles.rowText}>
				{label}
			</Text>
			{children}
		</Pressable>
	);
}

/** The TV row: a Cast glyph in a switch-sized pill, sun while a TV is connected. */
function TvRow({ connected }: { connected: boolean }) {
	// One element for screen readers, so the row's words are read, not the system control's own
	// name ("Cast not connected"); a double tap still lands on the control under it.
	return (
		<View
			accessibilityLabel="Play on the TV"
			accessibilityRole="button"
			accessibilityState={{ selected: connected }}
			accessible
			style={styles.row}
		>
			<Text allowFontScaling={false} style={styles.rowText}>
				Play on the TV
			</Text>
			<View
				pointerEvents="none"
				style={[
					styles.tvPill,
					{ backgroundColor: connected ? colors.sun : TRACK_TINT },
				]}
			>
				<CastIcon
					color={connected ? colors.inkNavy : colors.cream}
					size={TV_ICON}
				/>
			</View>
			<TvHit />
		</View>
	);
}

function Dropdown({
	connected,
	onLeave,
	right,
	top,
	tv,
}: {
	connected: boolean;
	onLeave?: () => void;
	right: number;
	top: number;
	tv: boolean;
}) {
	const router = useRouter();
	const { id = "box" } = useLocalSearchParams<{ id?: string }>();
	const captions = usePlayerPrefs((s) => s.captions);
	const muted = useMusic((s) => s.muted);
	return (
		<Animated.View
			accessibilityRole="menu"
			entering={menuEntering}
			exiting={FadeOut.duration(motion.exit)}
			style={[styles.menu, { right, top }]}
		>
			<Row
				checked={!muted}
				label="Music"
				onPress={() => useMusic.getState().setMuted(!muted)}
				role="switch"
			>
				<Switch on={!muted} />
			</Row>
			<Row
				checked={captions}
				label="Captions"
				onPress={() => usePlayerPrefs.getState().toggleCaptions()}
				role="switch"
			>
				<Switch on={captions} />
			</Row>
			{tv ? <TvRow connected={connected} /> : null}
			<Row
				label="Start again"
				onPress={() => {
					closeMenu();
					onLeave?.();
					// Through the night sky; the replay begins as the old screen goes.
					leaveActive(() => {
						useReplay.getState().start(id);
						router.replace(`/map?id=${id}`);
					});
				}}
				role="button"
			>
				<View pointerEvents="none" style={styles.lock}>
					<Icon color={colors.cream} name="play" size={LOCK_ICON} />
				</View>
			</Row>
			<Row
				label="Grown-ups"
				onPress={() => {
					closeMenu();
					onLeave?.();
					router.push("/gate");
				}}
				role="button"
			>
				<View pointerEvents="none" style={styles.lock}>
					<Icon color={colors.cream} name="lock" size={LOCK_ICON} />
				</View>
			</Row>
		</Animated.View>
	);
}

/**
 * The burger and its dropdown, laid over a whole screen: `right` and `top` place the button (and
 * the dropdown under it). The button toggles the dropdown; a tap anywhere else closes it. `onLeave` runs just before the Grown-ups row leaves the screen (a
 * place pauses its video).
 */
export function AdventureMenu({
	onLeave,
	right,
	top,
}: {
	onLeave?: () => void;
	right: number;
	top: number;
}) {
	const menuOpen = usePlayerPrefs((s) => s.menuOpen);
	// Read here, not in the TV row, so the TVs are already looked for when the menu opens.
	const tv = useCastAvailable();
	const connected = useCastConnected();
	return (
		<View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
			{menuOpen ? (
				<Pressable
					accessibilityLabel="Close the menu"
					onPress={closeMenu}
					style={StyleSheet.absoluteFill}
				/>
			) : null}
			<View pointerEvents="box-none" style={[styles.dock, { right, top }]}>
				<ClayPressable
					accessibilityLabel="Menu"
					accessibilityState={{ expanded: menuOpen }}
					onPress={toggleMenu}
					radius={radii.full}
					selected={menuOpen}
					style={styles.button}
				>
					<MenuGlyph />
				</ClayPressable>
			</View>
			{menuOpen ? (
				<Dropdown
					connected={connected}
					onLeave={onLeave}
					right={right}
					top={top + MENU_BUTTON + MENU_GAP}
					tv={tv || connected}
				/>
			) : null}
		</View>
	);
}

const styles = StyleSheet.create({
	button: {
		alignItems: "center",
		height: MENU_BUTTON,
		justifyContent: "center",
		width: MENU_BUTTON,
	},
	dock: { position: "absolute" },
	lock: {
		alignItems: "center",
		height: SWITCH_HEIGHT,
		justifyContent: "center",
		width: SWITCH_WIDTH,
	},
	menu: {
		backgroundColor: colors.plateDark,
		borderRadius: 22,
		paddingVertical: 6,
		position: "absolute",
		transformOrigin: "top right",
		width: MENU_WIDTH,
	},
	row: {
		alignItems: "center",
		flexDirection: "row",
		height: ROW_HEIGHT,
		justifyContent: "space-between",
		paddingHorizontal: 16,
	},
	rowText: {
		color: colors.cream,
		fontFamily: fonts.label,
		fontSize: ROW_TEXT,
	},
	switchTrack: {
		borderRadius: SWITCH_HEIGHT / 2,
		height: SWITCH_HEIGHT,
		justifyContent: "center",
		paddingHorizontal: THUMB_INSET,
		width: SWITCH_WIDTH,
	},
	thumb: {
		borderRadius: THUMB / 2,
		height: THUMB,
		width: THUMB,
	},
	tvPill: {
		alignItems: "center",
		borderRadius: SWITCH_HEIGHT / 2,
		height: SWITCH_HEIGHT,
		justifyContent: "center",
		width: SWITCH_WIDTH,
	},
});
