import { type ReactNode, useEffect, useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import Animated, {
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";
import { ClayText } from "./clay-text";
import { useCalm } from "./motion-provider";
import { colors, motion, shadows } from "./tokens";

const easeOut = Easing.bezier(...motion.easeOut);
const easeIn = Easing.bezier(0.5, 0, 0.75, 0);
const SHEET_RADIUS = 28;
const GRAB_WIDTH = 40;
const GRAB_HEIGHT = 5;
// Before the sheet is measured it waits this far below the screen.
const UNMEASURED = 600;

/**
 * A cream sheet that slides up over a dim scrim, with a grab handle and a title. A tap on the
 * scrim, or the Android back button, calls `onClose`. It slides up in `motion.enter` and sinks in
 * `motion.exit`, with no bounce; `onExited` runs once it is gone. Reduced motion: no movement,
 * only a quick fade. `rtl` right-aligns the title.
 */
export function BottomSheet({
	children,
	closeLabel,
	onClose,
	onExited,
	rtl = false,
	title,
	visible,
}: {
	children: ReactNode;
	closeLabel: string;
	onClose: () => void;
	onExited?: () => void;
	rtl?: boolean;
	title: string;
	visible: boolean;
}) {
	const calm = useCalm();
	const insets = useSafeAreaInsets();
	// The Modal stays mounted until the sink-out has finished.
	const [shown, setShown] = useState(visible);
	const p = useSharedValue(0);
	const wasOpen = useRef<boolean>(false);
	const exited = useRef(onExited);
	exited.current = onExited;
	const height = useSharedValue(UNMEASURED);

	useEffect(() => {
		if (visible) {
			wasOpen.current = true;
			setShown(true);
			p.set(
				withTiming(1, {
					duration: calm ? motion.reducedReveal : motion.enter,
					easing: easeOut,
				})
			);
			return;
		}
		if (!wasOpen.current) {
			return;
		}
		wasOpen.current = false;
		const done = () => {
			setShown(false);
			exited.current?.();
		};
		p.set(
			withTiming(
				0,
				{
					duration: calm ? motion.reducedReveal : motion.exit,
					easing: easeIn,
				},
				(finished) => {
					if (finished) {
						scheduleOnRN(done);
					}
				}
			)
		);
	}, [calm, p, visible]);

	const scrimStyle = useAnimatedStyle(() => ({ opacity: p.get() }));
	const sheetStyle = useAnimatedStyle(() => ({
		opacity: calm ? p.get() : 1,
		transform: [{ translateY: calm ? 0 : (1 - p.get()) * height.get() }],
	}));

	return (
		<Modal
			animationType="none"
			onRequestClose={onClose}
			statusBarTranslucent
			transparent
			visible={shown}
		>
			<Animated.View
				style={[
					StyleSheet.absoluteFill,
					{ backgroundColor: colors.scrim },
					scrimStyle,
				]}
			>
				<Pressable
					accessibilityLabel={closeLabel}
					accessibilityRole="button"
					onPress={onClose}
					style={StyleSheet.absoluteFill}
				/>
			</Animated.View>
			<View pointerEvents="box-none" style={styles.dock}>
				<Animated.View
					accessibilityViewIsModal
					onLayout={(e) => height.set(e.nativeEvent.layout.height)}
					style={[
						styles.sheet,
						{ paddingBottom: insets.bottom + 18 },
						sheetStyle,
					]}
				>
					<View style={styles.grab} />
					<ClayText
						accessibilityRole="header"
						align={rtl ? "right" : "left"}
						style={styles.title}
						variant="title"
					>
						{title}
					</ClayText>
					{children}
				</Animated.View>
			</View>
		</Modal>
	);
}

const styles = StyleSheet.create({
	dock: { flex: 1, justifyContent: "flex-end" },
	grab: {
		alignSelf: "center",
		backgroundColor: colors.toggleOff,
		borderRadius: GRAB_HEIGHT / 2,
		height: GRAB_HEIGHT,
		marginBottom: 12,
		width: GRAB_WIDTH,
	},
	sheet: {
		backgroundColor: colors.cream,
		borderTopLeftRadius: SHEET_RADIUS,
		borderTopRightRadius: SHEET_RADIUS,
		boxShadow: shadows.sheet,
		paddingHorizontal: 18,
		paddingTop: 10,
	},
	title: {
		fontSize: 20,
		lineHeight: 24,
		marginBottom: 10,
		marginHorizontal: 4,
	},
});
