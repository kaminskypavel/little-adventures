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
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, View } from "react-native";
import Animated, { cubicBezier } from "react-native-reanimated";
import {
	useSafeAreaFrame,
	useSafeAreaInsets,
} from "react-native-safe-area-context";
import type { EngineMe } from "@/src/data/engine-client";
import { setStepsOptions } from "@/src/data/engine-queries";
import { AdminOnly } from "./admin-only";
import { useAdminPanel } from "./admin-panel-store";
import { useMe } from "./use-me";

type Key = "pictures" | "story" | "video" | "voice";
type Values = Record<Key, boolean>;

const BUTTON = 40;
/** Under the dock in the home indicator's band, inset so the phone's rounded corner never clips it. */
const EDGE_SIDE = 22;
const EDGE_BOTTOM = 8;
const easeOut = cubicBezier(...motion.easeOut);

const ROWS: { key: Key; note: string; title: string }[] = [
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

const fromMe = (me: EngineMe): Values => me.steps;

/** Floating round admin button, mounted once in the root layout inside the app field. Admins only. */
export function AdminButton() {
	const setOpen = useAdminPanel((s) => s.setOpen);
	return (
		<View
			pointerEvents="box-none"
			// In the strip under the dock buttons (the home indicator's band), clear of content.
			style={{
				bottom: EDGE_BOTTOM,
				position: "absolute",
				right: EDGE_SIDE,
			}}
		>
			<AdminOnly>
				<IconButton
					accessibilityLabel="Admin switches"
					icon="sliders"
					onPress={() => setOpen(true)}
					style={{ height: BUTTON, width: BUTTON }}
				/>
			</AdminOnly>
		</View>
	);
}

/**
 * The switches as a bottom sheet over the app field (inside the phone frame, not a window
 * modal). Mounted once in the root layout, admins only.
 */
export function AdminPanel() {
	return (
		<AdminOnly crown={false}>
			<Overlay />
		</AdminOnly>
	);
}

function Overlay() {
	const calm = useCalm();
	const open = useAdminPanel((s) => s.open);
	const setOpen = useAdminPanel((s) => s.setOpen);
	// `shown` keeps the sheet mounted while it fades out; `entered` drives the transitions.
	const [shown, setShown] = useState(false);
	const [entered, setEntered] = useState(false);
	const insets = useSafeAreaInsets();

	useEffect(() => {
		if (open) {
			setShown(true);
			const raf = requestAnimationFrame(() => setEntered(true));
			return () => cancelAnimationFrame(raf);
		}
		setEntered(false);
		const timer = setTimeout(() => setShown(false), calm ? 0 : motion.exit);
		return () => clearTimeout(timer);
	}, [open, calm]);

	if (!shown) {
		return null;
	}

	const close = () => setOpen(false);
	const ms = entered ? motion.enter : motion.exit;
	const duration = calm ? motion.reducedReveal : ms;
	const fade = {
		opacity: entered ? 1 : 0,
		transitionDuration: duration,
		transitionProperty: "opacity",
		transitionTimingFunction: easeOut,
	} as const;

	return (
		<View pointerEvents="box-none" style={styles.overlay}>
			<Animated.View style={[styles.scrim, fade]}>
				<Pressable
					accessibilityLabel="Close admin switches"
					onPress={close}
					style={styles.fill}
				/>
			</Animated.View>
			<Animated.View
				pointerEvents="box-none"
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
	);
}

function Sheet({ onClose }: { onClose: () => void }) {
	const me = useMe();
	const client = useQueryClient();
	const steps = useMutation(setStepsOptions(client));
	const { height } = useSafeAreaFrame();
	const [failed, setFailed] = useState<Key | null>(null);
	const current = me ? fromMe(me) : null;
	const saving = steps.isPending;
	const screen = useAdminPanel((state) => state.screen);

	// The cache is updated at once and rolled back on error (see engine-queries.ts).
	const toggle = (key: Key, next: boolean) => {
		setFailed(null);
		steps.mutate({ [key]: next }, { onError: () => setFailed(key) });
	};

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
					{screen ? (
						<View style={styles.screenTools}>
							<ClayText style={styles.note} variant="body">
								{`This screen: ${screen.title}`}
							</ClayText>
							{screen.tools}
						</View>
					) : null}
					{ROWS.map(({ key, note, title }) => (
						<View key={key} style={styles.row}>
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
								trackColor={{
									false: colors.toggleOff,
									true: colors.deepNavy,
								}}
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
	fill: { flex: 1 },
	note: { fontSize: 16, lineHeight: 20, opacity: 0.8 },
	// Over the app, never in its layout: the screen under it keeps its size.
	overlay: { ...StyleSheet.absoluteFill },
	row: { alignItems: "center", flexDirection: "row", gap: layout.gap },
	rows: { gap: spacing.md },
	screenTools: { gap: spacing.sm },
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
