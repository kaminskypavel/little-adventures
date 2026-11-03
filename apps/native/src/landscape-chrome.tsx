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
	FadeIn,
	FadeOut,
	type SharedValue,
	useAnimatedStyle,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMusic } from "@/src/data/music-store";
import { usePlayerPrefs } from "@/src/data/player-prefs";

// The sideways player keeps the video clear: a small menu, a small name, one slim caption band
// and a thin line of progress along the bottom edge.
const MENU_BUTTON = 48;
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

function Row({
	checked,
	label,
	onPress,
	state,
}: {
	checked?: boolean;
	label: string;
	onPress: () => void;
	state?: string;
}) {
	return (
		<Pressable
			accessibilityLabel={state ? `${label} ${state}` : label}
			accessibilityRole="menuitem"
			accessibilityState={checked === undefined ? undefined : { checked }}
			onPress={onPress}
			style={styles.row}
		>
			<Text allowFontScaling={false} style={styles.rowText}>
				{label}
			</Text>
			{state ? (
				<View
					style={[
						styles.state,
						{ backgroundColor: checked ? colors.sun : TRACK_TINT },
					]}
				>
					<Text
						allowFontScaling={false}
						style={[
							styles.stateText,
							{ color: checked ? colors.nowWordInk : colors.cream },
						]}
					>
						{state}
					</Text>
				</View>
			) : null}
		</Pressable>
	);
}

function Menu({
	left,
	onBack,
	top,
}: {
	left: number;
	onBack: () => void;
	top: number;
}) {
	const captions = usePlayerPrefs((s) => s.captions);
	const muted = useMusic((s) => s.muted);
	const close = () => usePlayerPrefs.getState().setMenuOpen(false);
	return (
		<>
			<Pressable
				accessibilityLabel="Close the menu"
				onPress={close}
				style={StyleSheet.absoluteFill}
			/>
			<Animated.View
				accessibilityRole="menu"
				entering={FadeIn.duration(motion.select)}
				exiting={FadeOut.duration(motion.exit)}
				style={[styles.menu, { left, top }]}
			>
				<Row
					label="Back to the map"
					onPress={() => {
						close();
						onBack();
					}}
				/>
				<Row
					checked={!muted}
					label="Music"
					onPress={() => useMusic.getState().setMuted(!muted)}
					state={muted ? "Off" : "On"}
				/>
				<Row
					checked={captions}
					label="Captions"
					onPress={() => usePlayerPrefs.getState().toggleCaptions()}
					state={captions ? "On" : "Off"}
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
	const top = insets.top + layout.topBarOffset;
	return (
		<>
			<View pointerEvents="box-none" style={[styles.top, { left, top }]}>
				<ClayPressable
					accessibilityLabel="Menu"
					accessibilityState={{ expanded: menuOpen }}
					onPress={() => usePlayerPrefs.getState().setMenuOpen(!menuOpen)}
					radius={radii.full}
					selected={menuOpen}
					style={styles.menuButton}
				>
					<MenuGlyph />
				</ClayPressable>
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
				<Menu left={left} onBack={onBack} top={top + MENU_BUTTON + 8} />
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
		width: MENU_WIDTH,
	},
	menuButton: {
		alignItems: "center",
		height: MENU_BUTTON,
		justifyContent: "center",
		width: MENU_BUTTON,
	},
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
	state: {
		borderRadius: 12,
		paddingHorizontal: 10,
		paddingVertical: 3,
	},
	stateText: { fontFamily: fonts.heavy, fontSize: 14 },
	top: {
		alignItems: "center",
		flexDirection: "row",
		gap: 10,
		position: "absolute",
	},
	word: { fontFamily: fonts.label, fontSize: WORD_SIZE, lineHeight: WORD_LINE },
});
