import { zodResolver } from "@hookform/resolvers/zod";
import { Chip } from "@little-adventures/native-ui/chip";
import { ChoiceTile } from "@little-adventures/native-ui/choice-tile";
import { ClayText } from "@little-adventures/native-ui/clay-text";
import { FieldError } from "@little-adventures/native-ui/field-error";
import { TextField } from "@little-adventures/native-ui/text-field";
import {
	colors,
	layout,
	select,
	spacing,
} from "@little-adventures/native-ui/tokens";
import {
	type Child as ChildValues,
	childSchema,
} from "@little-adventures/validation/child";
import {
	type Control,
	Controller,
	type UseFormReturn,
	useForm,
} from "react-hook-form";
import { type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";
import type { Profile } from "@/src/data/types";
import { useT } from "@/src/i18n";
import { childFormStrings } from "@/src/i18n/strings/child-form";
import { useErrorText } from "@/src/i18n/strings/form-errors";

const ageRows = [
	[2, 3, 4, 5, 6],
	[7, 8, 9, 10, 11],
];
const LABEL = { opacity: 0.85 } as const;

function Group({
	style,
	children,
	error,
	label,
}: {
	children: React.ReactNode;
	error?: string;
	label: string;
	style?: StyleProp<ViewStyle>;
}) {
	return (
		<View style={style}>
			<ClayText color={colors.cream} style={LABEL} variant="label">
				{label}
			</ClayText>
			<View style={styles.groupBody}>{children}</View>
			<FieldError message={error} />
		</View>
	);
}

/** The form behind "Your hero" and a child's edit screen: name, boy or girl, age. */
export const useChildForm = (profile: Profile): UseFormReturn<ChildValues> =>
	useForm<ChildValues>({
		defaultValues: {
			age: profile.childAge ?? undefined,
			kind: profile.childKind,
			name: profile.childName,
		},
		mode: "onTouched",
		resolver: zodResolver(childSchema),
	});

/** The three fields, spaced for a column; the screen owns the scroll view around them. */
export function ChildFields({ control }: { control: Control<ChildValues> }) {
	const t = useT(childFormStrings);
	const errorText = useErrorText();
	return (
		<View style={styles.fields}>
			<Controller
				control={control}
				name="name"
				render={({ field, fieldState }) => (
					<TextField
						autoCapitalize="words"
						autoComplete="off"
						autoCorrect={false}
						error={errorText(fieldState.error?.message)}
						label={t("name")}
						onBlur={field.onBlur}
						onChangeText={field.onChange}
						returnKeyType="done"
						value={field.value}
					/>
				)}
			/>
			<Controller
				control={control}
				name="kind"
				render={({ field, fieldState }) => (
					<Group
						error={errorText(fieldState.error?.message)}
						label={t("boyOrGirl")}
					>
						<View style={styles.row}>
							<ChoiceTile
								label={t("girl")}
								onPress={() => field.onChange("girl")}
								selected={field.value === "girl"}
								style={styles.flex}
							/>
							<ChoiceTile
								label={t("boy")}
								onPress={() => field.onChange("boy")}
								selected={field.value === "boy"}
								style={styles.flex}
							/>
						</View>
					</Group>
				)}
			/>
			<Controller
				control={control}
				name="age"
				render={({ field, fieldState }) => (
					<Group
						error={errorText(fieldState.error?.message)}
						label={t("age")}
						style={styles.age}
					>
						<View style={styles.chips}>
							{ageRows.map((row) => (
								<View key={row[0]} style={styles.chipRow}>
									{row.map((n) => (
										<Chip
											key={n}
											label={String(n)}
											onPress={() => field.onChange(n)}
											selected={field.value === n}
											style={styles.flex}
										/>
									))}
								</View>
							))}
						</View>
					</Group>
				)}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	age: { marginTop: 4 },
	chipRow: { flexDirection: "row", gap: layout.gapTight },
	chips: { gap: select.lookRowGap },
	fields: { gap: spacing.lg },
	flex: { flex: 1 },
	groupBody: { marginTop: select.fieldLabelGap },
	row: { flexDirection: "row", gap: layout.gap },
});
