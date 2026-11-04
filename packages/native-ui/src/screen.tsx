import type { ReactNode } from "react";
import {
	Keyboard,
	Platform,
	Pressable,
	type StyleProp,
	StyleSheet,
	View,
	type ViewStyle,
} from "react-native";
import {
	KeyboardStickyView,
	useKeyboardState,
	useReanimatedKeyboardAnimation,
} from "react-native-keyboard-controller";
import Animated, {
	cubicBezier,
	useAnimatedStyle,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BackButton, useBackAction } from "./back-button";
import {
	BODY_FADE,
	BODY_FADE_TOP,
	BODY_KEYBOARD_GAP,
	bodyMaskImage,
	useBodyMask,
} from "./body-fade";
import { ClayText } from "./clay-text";
import { useCalm } from "./motion-provider";
import { TitleHold } from "./title-hold";
import { colors, layout, motion, spacing } from "./tokens";

const [x1, y1, x2, y2] = motion.easeOut;
// Space between the back button and the title.
const TITLE_GAP = 8;
const enterEase = cubicBezier(x1, y1, x2, y2);

const riseIn = {
	from: { opacity: 0, transform: [{ translateY: motion.enterRise }] },
	to: { opacity: 1, transform: [{ translateY: 0 }] },
};
const fadeIn = { from: { opacity: 0 }, to: { opacity: 1 } };

/**
 * Screen content enter: fade + rise, siblings staggered (title, body, dock).
 * A CSS animation, not a layout animation, so nothing is measured on the way in.
 */
function enter(index: number, calm: boolean) {
	if (calm) {
		return {
			animationDuration: `${motion.reducedReveal}ms`,
			animationName: fadeIn,
		} as const;
	}
	return {
		animationDelay: `${index * motion.enterStagger}ms`,
		animationDuration: `${motion.enter}ms`,
		animationFillMode: "backwards",
		animationName: riseIn,
		animationTimingFunction: enterEase,
	} as const;
}

/** The body with its fade: a CSS mask on web, the app-supplied mask on native. */
function FadedBody({
	bottom,
	children,
	top,
}: {
	bottom: number;
	children: ReactNode;
	top: number;
}) {
	const BodyMask = useBodyMask();
	if (bottom === 0 && top === 0) {
		return <View style={styles.bodyWrap}>{children}</View>;
	}
	if (Platform.OS !== "web" && BodyMask) {
		return (
			<BodyMask height={bottom} top={top}>
				{children}
			</BodyMask>
		);
	}
	return (
		<View
			style={[
				styles.bodyWrap,
				{ maskImage: bodyMaskImage(top, bottom) } as ViewStyle,
			]}
		>
			{children}
		</View>
	);
}

/** The docked actions. They ride on top of the keyboard, the home-indicator gap traded for it. */
function Dock({
	calm,
	children,
	float,
}: {
	calm: boolean;
	children: ReactNode;
	float: boolean;
}) {
	const insets = useSafeAreaInsets();
	const touches = float ? "box-none" : "auto";
	return (
		<KeyboardStickyView
			offset={{ closed: 0, opened: insets.bottom }}
			pointerEvents={touches}
			style={float ? styles.floatDock : null}
		>
			<Animated.View
				pointerEvents={touches}
				style={[
					styles.dock,
					{ paddingBottom: insets.bottom + layout.dockBottom },
					enter(2, calm),
				]}
			>
				{children}
			</Animated.View>
		</KeyboardStickyView>
	);
}

/**
 * One kid or grown-up screen: optional top bar, a centered headline about 80 pt
 * below the screen top, the hero band, and the docked actions at the bottom.
 * The sky is mounted once in the root layout and shows through. With a (non floating) dock the
 * body fades out over its last 80 pt, so scrolling content melts into the sky above the dock.
 * A scrolling body (`scrolls`) also fades in over its first 40 pt, under the headline. Its
 * scroll view needs `BODY_SCROLL_END` bottom padding above a faded dock.
 */
export function Screen({
	bodyFade = true,
	bodyStyle,
	children,
	compactTitle = false,
	dim = false,
	dock,
	floatDock = false,
	onTitleLongPress,
	scrolls = false,
	title,
	titleTop,
	topBar,
}: {
	/** False for a body that never scrolls (the map): nothing fades out above the dock. */
	bodyFade?: boolean;
	bodyStyle?: StyleProp<ViewStyle>;
	children?: ReactNode;
	/** 37 pt headline, for two long lines. */
	compactTitle?: boolean;
	/** Scrim over the sky for text-heavy screens. */
	dim?: boolean;
	/** Bottom actions, stacked 14 apart (primary 88, secondary 80). */
	dock?: ReactNode;
	/** The dock floats over the body, which then runs to the bottom (for scrolling screens). */
	floatDock?: boolean;
	/** A 1 s hold on the title. Defaults to the app's `TitleHoldProvider` action. */
	onTitleLongPress?: () => void;
	/** The body holds a scroll view: content fades out under the headline instead of a flat cut. */
	scrolls?: boolean;
	/** One line: it sits on the back button's row, centred between the button and the right edge. */
	title?: string;
	/** Distance of the headline from the screen top (default: on the back button's row). */
	titleTop?: number;
	topBar?: ReactNode;
}) {
	const insets = useSafeAreaInsets();
	const calm = useCalm();
	const onBack = useBackAction();
	// The tap-away catcher only listens while the keyboard is up: otherwise, on Android, it took
	// slow drags from the scroll views inside the body (the replay shelf did not scroll).
	const keyboardUp = useKeyboardState((state) => state.isVisible);
	// Without a top bar the back button floats in the top left corner over the content, so the
	// headline sits where it always did (titleTop below the top of the screen).
	const floatBack = topBar ? null : onBack;
	const fadeBottom = dock && !floatDock && bodyFade ? BODY_FADE : 0;
	const fadeTop = scrolls ? BODY_FADE_TOP : 0;
	const body = (
		<Animated.View style={[styles.body, bodyStyle, enter(1, calm)]}>
			{children}
		</Animated.View>
	);
	// The docked actions ride on the keyboard; the body shrinks by the same amount, so it always
	// ends (with its fade) where they begin and nothing sits under them, as iOS does with a bottom
	// safe-area inset. A floating dock runs over a scrolling body and needs none of this.
	const keyboard = useReanimatedKeyboardAnimation();
	const docked = Boolean(dock) && !floatDock;
	const aboveKeyboard = useAnimatedStyle(() => ({
		marginBottom: docked
			? Math.max(0, -keyboard.height.get() - insets.bottom) +
				BODY_KEYBOARD_GAP * keyboard.progress.get()
			: 0,
	}));

	return (
		<View style={styles.root}>
			{dim ? (
				<View
					pointerEvents="none"
					style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }]}
				/>
			) : null}
			{topBar ? (
				<View
					style={[
						styles.topBar,
						{ marginTop: insets.top + layout.topBarOffset },
					]}
				>
					{onBack ? <BackButton onPress={onBack} /> : null}
					{topBar}
				</View>
			) : null}
			{title ? (
				<Animated.View
					style={[
						topBar
							? [styles.title, { marginTop: spacing.lg }]
							: [
									styles.titleRow,
									{ marginTop: titleTop ?? insets.top + layout.topBarOffset },
								],
						enter(0, calm),
					]}
				>
					<TitleHold onTitleLongPress={onTitleLongPress}>
						<ClayText
							accessibilityRole="header"
							adjustsFontSizeToFit
							align="center"
							color={colors.cream}
							minimumFontScale={0.8}
							numberOfLines={1}
							variant={compactTitle ? "headlineLong" : "headline"}
						>
							{title}
						</ClayText>
					</TitleHold>
				</Animated.View>
			) : null}
			{/* A tap on the screen's empty space puts the keyboard away. */}
			<Animated.View style={[styles.bodyWrap, aboveKeyboard]}>
				<Pressable
					accessible={false}
					onPress={Keyboard.dismiss}
					// box-none while the keyboard is down: no touch grab, and unlike `disabled` no aria-disabled on the subtree.
					pointerEvents={keyboardUp === true ? "auto" : "box-none"}
					style={styles.bodyWrap}
				>
					<FadedBody bottom={fadeBottom} top={fadeTop}>
						{body}
					</FadedBody>
				</Pressable>
			</Animated.View>
			{dock ? (
				<Dock calm={calm} float={floatDock}>
					{dock}
				</Dock>
			) : null}
			{floatBack ? (
				<View
					style={[styles.floatBack, { top: insets.top + layout.topBarOffset }]}
				>
					<BackButton onPress={floatBack} />
				</View>
			) : null}
		</View>
	);
}

const styles = StyleSheet.create({
	body: { flex: 1, paddingHorizontal: layout.sideMargin },
	bodyWrap: { flex: 1 },
	dock: { gap: layout.gap, paddingHorizontal: layout.sideMargin },
	floatBack: { left: layout.sideMargin, position: "absolute" },
	floatDock: { bottom: 0, left: 0, position: "absolute", right: 0 },
	root: { flex: 1 },
	title: { paddingHorizontal: layout.sideMargin },
	// The back button's row: the title is centred in it and kept clear of the button on both sides.
	titleRow: {
		height: layout.minTarget,
		justifyContent: "center",
		paddingHorizontal: layout.sideMargin + layout.minTarget + TITLE_GAP,
	},
	topBar: {
		alignItems: "center",
		flexDirection: "row",
		gap: layout.gap,
		height: layout.topBarHeight,
		paddingHorizontal: layout.sideMargin,
	},
});
