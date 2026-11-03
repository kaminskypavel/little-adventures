import { BackButton } from "@little-adventures/native-ui/back-button";
import { ClayPressable } from "@little-adventures/native-ui/clay-pressable";
import { Icon } from "@little-adventures/native-ui/icons";
import {
	colors,
	fonts,
	layout,
	motion,
	radii,
} from "@little-adventures/native-ui/tokens";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
	Easing,
	FadeOut,
	type SharedValue,
	useAnimatedStyle,
	useDerivedValue,
	withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMusic } from "@/src/data/music-store";
import { usePlayerPrefs } from "@/src/data/player-prefs";

// The sideways player keeps the video clear: a small menu, a small name, one slim caption band
// and a thin line of progress along the bottom edge.
const MENU_BUTTON = layout.minTarget;
const PAUSE_SIZE = 62;
const PAUSE_ICON_SIZE = 29;
const BAND_BG = "rgba(10,22,44,0.55)";
const BAND_MAX_WIDTH = "60%";
const WORD_SIZE = 17;
const WORD_LINE = 22;
const LINE_HEIGHT = 3;
const MENU_WIDTH = 232;
const ROW_HEIGHT = 48;
const ROW_TEXT = 16;
const TRACK_TINT = "rgba(244,236,216,0.2)";
const BAR_WIDTH = 20;
const BAR_HEIGHT = 3;
const BAR_GAP = 4;
// The menu closes itself after this long without a touch.
const IDLE_CLOSE_MS = 4000;
const SWITCH_WIDTH = 52;
const SWITCH_HEIGHT = 30;
const THUMB = 24;
const THUMB_INSET = 3;
const MENU_GAP = 8;
const MENU_FROM_SCALE = 0.92;

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

let idleTimer: ReturnType<typeof setTimeout> | undefined;

function closeMenu() {
	clearTimeout(idleTimer);
	usePlayerPrefs.getState().setMenuOpen(false);
}

/** Starts (or restarts) the countdown that closes the menu when nobody touches it. */
function armIdleClose() {
	clearTimeout(idleTimer);
	idleTimer = setTimeout(closeMenu, IDLE_CLOSE_MS);
}

function toggleMenu() {
	const { menuOpen, setMenuOpen } = usePlayerPrefs.getState();
	if (menuOpen) {
		closeMenu();
		return;
	}
	setMenuOpen(true);
	armIdleClose();
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
	label,
	on,
	onPress,
}: {
	label: string;
	on: boolean;
	onPress: () => void;
}) {
	return (
		<Pressable
			accessibilityLabel={label}
			accessibilityRole="switch"
			accessibilityState={{ checked: on }}
			onPress={() => {
				armIdleClose();
				onPress();
			}}
			style={styles.row}
		>
			<Text allowFontScaling={false} style={styles.rowText}>
				{label}
			</Text>
			<Switch on={on} />
		</Pressable>
	);
}

function Menu({ right, top }: { right: number; top: number }) {
	const captions = usePlayerPrefs((s) => s.captions);
	const muted = useMusic((s) => s.muted);
	return (
		<>
			<Pressable
				accessibilityLabel="Close the menu"
				onPress={closeMenu}
				style={StyleSheet.absoluteFill}
			/>
			<Animated.View
				accessibilityRole="menu"
				entering={menuEntering}
				exiting={FadeOut.duration(motion.exit)}
				style={[styles.menu, { right, top }]}
			>
				<Row
					label="Music"
					on={!muted}
					onPress={() => useMusic.getState().setMuted(!muted)}
				/>
				<Row
					label="Captions"
					on={captions}
					onPress={() => usePlayerPrefs.getState().toggleCaptions()}
				/>
			</Animated.View>
		</>
	);
}

function ProgressLine({
	progress,
}: {
	progress: number | SharedValue<number>;
}) {
	const fill = useAnimatedStyle(() => {
		const value = typeof progress === "number" ? progress : progress.get();
		return { width: `${Math.min(1, Math.max(0, value)) * 100}%` };
	});
	return (
		<View pointerEvents="none" style={styles.line}>
			<Animated.View style={[styles.fill, fill]} />
		</View>
	);
}

/**
 * The sideways player's controls over the video: the menu button with the small place name, the
 * read-along line in a slim band, pause at the bottom right, and the whole place's progress as a
 * thin line along the bottom edge.
 */
export function LandscapeChrome({
	current,
	name,
	onBack,
	onToggle,
	playing,
	progress,
	words,
}: {
	/** Index into `words` of the word being spoken. */
	current: number;
	name: string;
	onBack: () => void;
	onToggle: () => void;
	playing: boolean;
	progress: number | SharedValue<number>;
	words: string[];
}) {
	const insets = useSafeAreaInsets();
	const menuOpen = usePlayerPrefs((s) => s.menuOpen);
	const captions = usePlayerPrefs((s) => s.captions);
	const left = insets.left + layout.sideMargin;
	const right = insets.right + layout.sideMargin;
	const top = insets.top + layout.topBarOffset;
	return (
		<>
			<View pointerEvents="box-none" style={[styles.top, { left, top }]}>
				<BackButton onPress={onBack} />
				<View style={styles.pill}>
					<Text
						allowFontScaling={false}
						numberOfLines={1}
						style={styles.pillText}
					>
						{name}
					</Text>
				</View>
			</View>
			<View pointerEvents="box-none" style={[styles.menuDock, { right, top }]}>
				<ClayPressable
					accessibilityLabel="Menu"
					accessibilityState={{ expanded: menuOpen }}
					onPress={toggleMenu}
					radius={radii.full}
					selected={menuOpen}
					style={styles.menuButton}
				>
					<MenuGlyph />
				</ClayPressable>
			</View>
			{captions && words.length > 0 ? (
				<View
					pointerEvents="none"
					style={[styles.captionRow, { bottom: insets.bottom + layout.gap }]}
				>
					<View
						accessibilityLabel={words.join(" ")}
						accessible
						style={styles.band}
					>
						{words.map((word, index) => (
							<View
								// biome-ignore lint/suspicious/noArrayIndexKey: the same word can repeat, the position is the identity
								key={`${index}-${word}`}
								style={
									index === current
										? styles.nowWord
										: { opacity: index > current ? 0.5 : 1 }
								}
							>
								<Text
									allowFontScaling={false}
									style={[
										styles.word,
										{
											color:
												index === current ? colors.nowWordInk : colors.cream,
										},
									]}
								>
									{word}
								</Text>
							</View>
						))}
					</View>
				</View>
			) : null}
			<View
				pointerEvents="box-none"
				style={[
					styles.pauseDock,
					{
						bottom: insets.bottom + layout.dockBottom,
						right: insets.right + layout.sideMargin,
					},
				]}
			>
				<ClayPressable
					accessibilityLabel={playing ? "Pause" : "Play"}
					onPress={onToggle}
					radius={radii.full}
					style={styles.pause}
					tone="sun"
				>
					<Icon
						color={colors.inkNavy}
						name={playing ? "pause" : "play"}
						size={PAUSE_ICON_SIZE}
					/>
				</ClayPressable>
			</View>
			<ProgressLine progress={progress} />
			{menuOpen ? (
				<Menu right={right} top={top + MENU_BUTTON + MENU_GAP} />
			) : null}
		</>
	);
}

const styles = StyleSheet.create({
	band: {
		alignItems: "center",
		backgroundColor: BAND_BG,
		borderRadius: 16,
		columnGap: 5,
		flexDirection: "row",
		flexWrap: "wrap",
		justifyContent: "center",
		maxWidth: BAND_MAX_WIDTH,
		paddingHorizontal: 12,
		paddingVertical: 6,
	},
	captionRow: {
		alignItems: "center",
		left: 0,
		position: "absolute",
		right: 0,
	},
	fill: {
		backgroundColor: colors.sun,
		height: "100%",
	},
	line: {
		backgroundColor: TRACK_TINT,
		bottom: 0,
		height: LINE_HEIGHT,
		left: 0,
		position: "absolute",
		right: 0,
	},
	menu: {
		backgroundColor: colors.plateDark,
		borderRadius: 22,
		paddingVertical: 6,
		position: "absolute",
		transformOrigin: "top right",
		width: MENU_WIDTH,
	},
	menuButton: {
		alignItems: "center",
		height: MENU_BUTTON,
		justifyContent: "center",
		width: MENU_BUTTON,
	},
	menuDock: { position: "absolute" },
	nowWord: {
		backgroundColor: colors.sun,
		borderRadius: 7,
		paddingHorizontal: 4,
	},
	pause: {
		alignItems: "center",
		height: PAUSE_SIZE,
		justifyContent: "center",
		width: PAUSE_SIZE,
	},
	pauseDock: { position: "absolute" },
	pill: {
		backgroundColor: colors.namePill,
		borderRadius: 17,
		paddingBottom: 4,
		paddingHorizontal: 12,
		paddingTop: 2,
	},
	pillText: {
		color: colors.cream,
		fontFamily: fonts.heavy,
		fontSize: 16,
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
	top: {
		alignItems: "center",
		flexDirection: "row",
		gap: 10,
		position: "absolute",
	},
	word: { fontFamily: fonts.label, fontSize: WORD_SIZE, lineHeight: WORD_LINE },
});
