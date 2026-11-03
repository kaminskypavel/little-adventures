import { BottomSheet } from "@little-adventures/native-ui/bottom-sheet";
import { ClayText } from "@little-adventures/native-ui/clay-text";
import { Icon } from "@little-adventures/native-ui/icons";
import { colors, flat, layout } from "@little-adventures/native-ui/tokens";
import { useRef, useState } from "react";
import {
	Pressable,
	type StyleProp,
	StyleSheet,
	Text,
	View,
	type ViewStyle,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { LANGUAGES, type Language } from "@/src/i18n";

const COIN = 34;
// The emoji is drawn much larger than the coin, so only the middle of the flag shows.
const FLAG = 44;
const CHEVRON = 18;
const CHECK = 26;
const ROW_LINE = 22;
const OPTION_HEIGHT = 56;

/** A language's flag in a small round coin with a thin cream ring. */
function FlagCoin({ flag }: { flag: string }) {
	return (
		<View importantForAccessibility="no-hide-descendants" style={styles.coin}>
			<Text accessible={false} allowFontScaling={false} style={styles.flag}>
				{flag}
			</Text>
		</View>
	);
}

/**
 * Grown-ups "Language": one sand row showing the current flag and name; a tap opens a sheet with a
 * row per language. `rtl` mirrors both for Hebrew. `onPick` runs once the sheet has sunk away.
 */
export function LanguagePicker({
	chooseLabel,
	closeLabel,
	current,
	label,
	onPick,
	rowLabel,
	rtl,
	style,
}: {
	chooseLabel: string;
	closeLabel: string;
	current: Language;
	label: string;
	onPick: (next: Language) => void;
	rowLabel: string;
	rtl: boolean;
	style?: StyleProp<ViewStyle>;
}) {
	const [open, setOpen] = useState(false);
	// The language is applied after the sheet has gone, so it does not flip while it sinks.
	const picked = useRef<Language | null>(null);
	const row = rtl ? "row-reverse" : "row";
	const now = LANGUAGES.find((l) => l.code === current) ?? LANGUAGES[0];

	const applyPicked = () => {
		const next = picked.current;
		picked.current = null;
		if (next) {
			onPick(next);
		}
	};

	return (
		<View style={style}>
			<Pressable
				accessibilityLabel={rowLabel}
				accessibilityRole="button"
				onPress={() => setOpen(true)}
				style={({ pressed }) => [
					styles.plate,
					{ flexDirection: row, opacity: pressed ? 0.7 : 1 },
				]}
			>
				<ClayText numberOfLines={1} style={styles.label} variant="body">
					{label}
				</ClayText>
				<View style={[styles.value, { flexDirection: row }]}>
					<FlagCoin flag={now.flag} />
					<ClayText numberOfLines={1} style={styles.name} variant="body">
						{now.name}
					</ClayText>
					<Svg
						height={CHEVRON}
						style={{
							opacity: 0.5,
							transform: [{ scaleX: rtl ? -1 : 1 }],
						}}
						viewBox="0 0 24 24"
						width={CHEVRON}
					>
						<Path
							d="M9 5.5L15.5 12L9 18.5"
							fill="none"
							stroke={colors.inkNavy}
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={3}
						/>
					</Svg>
				</View>
			</Pressable>
			<BottomSheet
				closeLabel={closeLabel}
				onClose={() => setOpen(false)}
				onExited={applyPicked}
				rtl={rtl}
				title={chooseLabel}
				visible={open}
			>
				{LANGUAGES.map(({ code, flag, name }) => {
					const on = code === current;
					return (
						<Pressable
							accessibilityLabel={name}
							accessibilityRole="button"
							accessibilityState={{ selected: on }}
							key={code}
							onPress={() => {
								picked.current = on ? null : code;
								setOpen(false);
							}}
							style={({ pressed }) => [
								styles.option,
								{
									backgroundColor: on ? colors.sand : undefined,
									flexDirection: row,
									opacity: pressed ? 0.7 : 1,
								},
							]}
						>
							<FlagCoin flag={flag} />
							<ClayText
								align={rtl ? "right" : "left"}
								numberOfLines={1}
								style={styles.optionName}
								variant="body"
							>
								{name}
							</ClayText>
							{on ? (
								<View style={styles.check}>
									<Icon color={colors.inkNavy} name="check" size={15} />
								</View>
							) : null}
						</Pressable>
					);
				})}
			</BottomSheet>
		</View>
	);
}

const styles = StyleSheet.create({
	check: {
		alignItems: "center",
		backgroundColor: colors.sun,
		borderRadius: CHECK / 2,
		height: CHECK,
		justifyContent: "center",
		width: CHECK,
	},
	coin: {
		alignItems: "center",
		borderRadius: COIN / 2,
		boxShadow: `0px 0px 0px 2px ${colors.cream}`,
		height: COIN,
		justifyContent: "center",
		overflow: "hidden",
		width: COIN,
	},
	flag: { fontSize: FLAG, includeFontPadding: false, lineHeight: FLAG + 4 },
	label: { fontSize: 18, lineHeight: ROW_LINE },
	name: { fontSize: 18, lineHeight: ROW_LINE, opacity: 0.85 },
	option: {
		alignItems: "center",
		borderRadius: 16,
		gap: 12,
		minHeight: OPTION_HEIGHT,
		paddingHorizontal: 12,
		paddingVertical: 10,
	},
	optionName: { flex: 1, fontSize: 19, lineHeight: 24 },
	plate: {
		alignItems: "center",
		alignSelf: "stretch",
		backgroundColor: colors.sand,
		borderRadius: flat.plan.radius,
		gap: 12,
		justifyContent: "space-between",
		minHeight: layout.minTarget,
		paddingHorizontal: flat.plan.padX,
		paddingVertical: 12,
	},
	value: { alignItems: "center", flexShrink: 1, gap: 8 },
});
