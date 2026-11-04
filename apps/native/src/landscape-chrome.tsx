import { BackButton } from "@little-adventures/native-ui/back-button";
import { ClayPressable } from "@little-adventures/native-ui/clay-pressable";
import { Icon } from "@little-adventures/native-ui/icons";
import {
	colors,
	fonts,
	layout,
	radii,
} from "@little-adventures/native-ui/tokens";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
	type SharedValue,
	useAnimatedStyle,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AdventureMenu } from "@/src/adventure-menu";
import { usePlayerPrefs } from "@/src/data/player-prefs";
import { isRtl, useLanguage } from "@/src/i18n";

/** The right-to-left mark (U+200F). */
const RLM = "\u200f";

// The sideways player keeps the video clear: a menu (see adventure-menu), a small name, one slim
// caption band and a thin line of progress along the bottom edge.
const PAUSE_SIZE = 62;
const PAUSE_ICON_SIZE = 29;
const BAND_BG = "rgba(10,22,44,0.55)";
const BAND_MAX_WIDTH = "60%";
const WORD_SIZE = 17;
const WORD_LINE = 22;
const LINE_HEIGHT = 3;
const TRACK_TINT = "rgba(244,236,216,0.2)";

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
 * The sideways player's controls over the video: back with the small place name, the menu at the
 * top right, the read-along line in a slim band, pause at the bottom right, and the whole place's
 * progress as a thin line along the bottom edge.
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
	const captions = usePlayerPrefs((s) => s.captions);
	const rtl = isRtl(useLanguage());
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
			{captions && words.length > 0 ? (
				<View
					pointerEvents="none"
					style={[styles.captionRow, { bottom: insets.bottom + layout.gap }]}
				>
					<View
						accessibilityLabel={words.join(" ")}
						accessible
						style={[styles.band, rtl && styles.bandRtl]}
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
									{/* A right-to-left mark after a Hebrew word puts its full stop or comma on its left. */}
									{`${word}${rtl ? RLM : ""}`}
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
			<AdventureMenu
				onLeave={playing ? onToggle : undefined}
				right={right}
				top={top}
			/>
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
	// Hebrew: the first word on the right, lines filling leftward.
	bandRtl: { flexDirection: "row-reverse" },
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
	top: {
		alignItems: "center",
		flexDirection: "row",
		gap: 10,
		position: "absolute",
	},
	word: { fontFamily: fonts.label, fontSize: WORD_SIZE, lineHeight: WORD_LINE },
});
