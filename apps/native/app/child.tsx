import { zodResolver } from "@hookform/resolvers/zod";
import { PrimaryButton } from "@little-adventures/native-ui/button";
import { Chip } from "@little-adventures/native-ui/chip";
import { ChoiceTile } from "@little-adventures/native-ui/choice-tile";
import { ClayText } from "@little-adventures/native-ui/clay-text";
import { FieldError } from "@little-adventures/native-ui/field-error";
import { Screen } from "@little-adventures/native-ui/screen";
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
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";
import { getProfile, saveProfile } from "@/src/data/adventure-client";
import type { Profile } from "@/src/data/types";

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

function ChildForm({ profile }: { profile: Profile }) {
	const router = useRouter();
	const { control, handleSubmit } = useForm<ChildValues>({
		defaultValues: {
			age: profile.childAge ?? undefined,
			kind: profile.childKind,
			name: profile.childName,
		},
		mode: "onTouched",
		resolver: zodResolver(childSchema),
	});

	const next = handleSubmit(async ({ age, kind, name }) => {
		await saveProfile({ childAge: age, childKind: kind, childName: name });
		router.push("/photo");
	});

	return (
		<Screen
			bodyStyle={styles.body}
			dock={<PrimaryButton label="Next" onPress={next} />}
			title="Who's the hero?"
		>
			<Controller
				control={control}
				name="name"
				render={({ field, fieldState }) => (
					<TextField
						autoCapitalize="words"
						autoComplete="off"
						autoCorrect={false}
						error={fieldState.error?.message}
						label="Name"
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
					<Group error={fieldState.error?.message} label="Boy or girl">
						<View style={styles.row}>
							<ChoiceTile
								label="Girl"
								onPress={() => field.onChange("girl")}
								selected={field.value === "girl"}
								style={styles.flex}
							/>
							<ChoiceTile
								label="Boy"
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
						error={fieldState.error?.message}
						label="Age"
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
		</Screen>
	);
}

export default function Child() {
	const [profile, setProfile] = useState<Profile | null>(null);

	useEffect(() => {
		getProfile().then(setProfile);
	}, []);

	return profile ? <ChildForm profile={profile} /> : null;
}

const styles = StyleSheet.create({
	age: { marginTop: 4 },
	body: { gap: spacing.lg, paddingTop: 34 },
	chipRow: { flexDirection: "row", gap: layout.gapTight },
	chips: { gap: select.lookRowGap },
	flex: { flex: 1 },
	groupBody: { marginTop: select.fieldLabelGap },
	row: { flexDirection: "row", gap: layout.gap },
});
