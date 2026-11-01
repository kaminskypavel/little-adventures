import { SecondaryButton } from "@little-adventures/native-ui/button";
import { ClaySurface } from "@little-adventures/native-ui/clay-surface";
import { ClayText } from "@little-adventures/native-ui/clay-text";
import { IconButton } from "@little-adventures/native-ui/icon-button";
import { useCalm } from "@little-adventures/native-ui/motion-provider";
import {
	colors,
	layout,
	motion,
	radii,
	spacing,
} from "@little-adventures/native-ui/tokens";
import { useState } from "react";
import {
	Modal,
	Pressable,
	ScrollView,
	StyleSheet,
	Switch,
	useWindowDimensions,
	View,
} from "react-native";
import Animated, { cubicBezier } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { setLive, setSteps } from "@/src/data/adventure-client";
import type { EngineMe } from "@/src/data/engine-client";
import { useMe } from "./use-is-admin";

type Key = "live" | "pictures" | "story" | "video" | "voice";
type Values = Record<Key, boolean>;

const BUTTON = 48;
const easeOut = cubicBezier(...motion.easeOut);

const ROWS: { key: Key; note: string; title: string }[] = [
	{
		key: "live",
		note: "Off: everyone gets the recorded adventure",
		title: "Live adventures",
	},
	{
		key: "story",
		note: "Off: the recorded adventure",
		title: "Story and checks",
	},
	{ key: "pictures", note: "Off: stand-in pictures", title: "Pictures" },
	{ key: "voice", note: "Off: read-along text only", title: "Voice" },
	{
		key: "video",
		note: "Off: a still picture and the voice",
		title: "Video clips",
	},
];

const fromMe = (me: EngineMe): Values => ({ live: me.live, ...me.steps });

/** A step only matters when everything it depends on is on. Dimmed rows still toggle. */
const dimmed = (v: Values): Record<Key, boolean> => ({
	live: false,
	pictures: !(v.live && v.story),
	story: !v.live,
	video: !(v.live && v.story && v.pictures),
	voice: !(v.live && v.story),
});

/** Round admin button (wrap in AdminOnly) that opens the switches for each paid model step. */
export function AdminSwitches() {
	const calm = useCalm();
	// `shown` keeps the modal mounted while it fades out; `entered` drives the transitions.
	const [shown, setShown] = useState(false);
	const [entered, setEntered] = useState(false);
	const insets = useSafeAreaInsets();

	const open = () => {
		setShown(true);
		requestAnimationFrame(() => setEntered(true));
	};
	const close = () => {
		setEntered(false);
		setTimeout(() => setShown(false), calm ? 0 : motion.exit);
	};

	const ms = entered ? motion.enter : motion.exit;
	const duration = calm ? motion.reducedReveal : ms;
	const fade = {
		opacity: entered ? 1 : 0,
		transitionDuration: duration,
		transitionProperty: "opacity",
		transitionTimingFunction: easeOut,
	} as const;

	return (
		<>
			<IconButton
				accessibilityLabel="Admin switches"
				icon="sliders"
				onPress={open}
				style={{ height: BUTTON, width: BUTTON }}
			/>
			<Modal
				animationType="none"
				onRequestClose={close}
				statusBarTranslucent
				transparent
				visible={shown}
			>
				<View style={styles.fill}>
					<Animated.View style={[styles.scrim, fade]}>
						<Pressable
							accessibilityLabel="Close admin switches"
							onPress={close}
							style={styles.fill}
						/>
					</Animated.View>
					<Animated.View
						style={[
							styles.sheetWrap,
							{ paddingBottom: Math.max(insets.bottom, layout.dockBottom) },
							fade,
							{
								transform: [
									{ translateY: entered || calm ? 0 : motion.enterRise * 3 },
								],
								transitionProperty: ["opacity", "transform"],
							},
						]}
					>
						<Sheet onClose={close} />
					</Animated.View>
				</View>
			</Modal>
		</>
	);
}

function Sheet({ onClose }: { onClose: () => void }) {
	const me = useMe();
	const { height } = useWindowDimensions();
	const [values, setValues] = useState<Values | null>(null);
	const [saving, setSaving] = useState(false);
	const [failed, setFailed] = useState<Key | null>(null);
	const current = values ?? (me ? fromMe(me) : null);

	// Optimistic: show the new value at once, then what the engine says; roll back on error.
	const toggle = async (key: Key, next: boolean) => {
		if (!current) {
			return;
		}
		setSaving(true);
		setFailed(null);
		setValues({ ...current, [key]: next });
		try {
			const saved =
				key === "live"
					? { live: (await setLive(next)).live }
					: (await setSteps({ [key]: next })).steps;
			setValues((v) => (v ? { ...v, ...saved } : v));
		} catch {
			setValues((v) => (v ? { ...v, [key]: !next } : v));
			setFailed(key);
		} finally {
			setSaving(false);
		}
	};

	const off = current ? dimmed(current) : null;

	return (
		<ClaySurface radius={radii.card} tone="field">
			<View style={styles.sheet}>
				<ClayText accessibilityRole="header" variant="title">
					Admin switches
				</ClayText>
				<ScrollView
					contentContainerStyle={styles.rows}
					showsVerticalScrollIndicator={false}
					style={{ maxHeight: height * 0.5 }}
				>
					{ROWS.map(({ key, note, title }) => (
						<View
							key={key}
							style={[styles.row, off?.[key] ? styles.dim : null]}
						>
							<View style={styles.text}>
								<ClayText variant="label">{title}</ClayText>
								<ClayText style={styles.note} variant="body">
									{note}
								</ClayText>
								{failed === key ? (
									<ClayText
										accessibilityLiveRegion="polite"
										role="alert"
										variant="fieldError"
									>
										Could not change it. Try again.
									</ClayText>
								) : null}
							</View>
							<Switch
								accessibilityLabel={title}
								disabled={saving || !current}
								onValueChange={(next) => toggle(key, next)}
								thumbColor={colors.star}
								trackColor={{ false: colors.toggleOff, true: colors.deepNavy }}
								value={current?.[key] ?? false}
							/>
						</View>
					))}
				</ScrollView>
				<SecondaryButton label="Close" onPress={onClose} />
			</View>
		</ClaySurface>
	);
}

const styles = StyleSheet.create({
	dim: { opacity: 0.45 },
	fill: { flex: 1 },
	note: { fontSize: 16, lineHeight: 20, opacity: 0.8 },
	row: { alignItems: "center", flexDirection: "row", gap: layout.gap },
	rows: { gap: spacing.md },
	scrim: { ...StyleSheet.absoluteFill, backgroundColor: colors.scrim },
	sheet: { gap: spacing.md, padding: spacing.lg },
	sheetWrap: {
		bottom: 0,
		left: 0,
		paddingHorizontal: layout.sideMargin,
		position: "absolute",
		right: 0,
	},
	text: { flex: 1, gap: 3 },
});
