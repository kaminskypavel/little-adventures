import { PrimaryButton } from "@little-adventures/native-ui/button";
import { Chip } from "@little-adventures/native-ui/chip";
import { ChoiceTile } from "@little-adventures/native-ui/choice-tile";
import { ClayText } from "@little-adventures/native-ui/clay-text";
import { Screen } from "@little-adventures/native-ui/screen";
import { TextField } from "@little-adventures/native-ui/text-field";
import {
	colors,
	layout,
	select,
	spacing,
} from "@little-adventures/native-ui/tokens";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
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
	label,
}: {
	children: React.ReactNode;
	label: string;
	style?: StyleProp<ViewStyle>;
}) {
	return (
		<View style={style}>
			<ClayText color={colors.cream} style={LABEL} variant="label">
				{label}
			</ClayText>
			<View style={styles.groupBody}>{children}</View>
		</View>
	);
}

function ChildForm({ profile }: { profile: Profile }) {
	const router = useRouter();
	const [name, setName] = useState(profile.childName);
	const [kind, setKind] = useState<Profile["childKind"]>(profile.childKind);
	const [age, setAge] = useState<number>(profile.childAge);
	const ready = name.trim().length > 0;

	const next = async () => {
		await saveProfile({
			childAge: age,
			childKind: kind,
			childName: name.trim(),
		});
		router.push("/photo");
	};

	return (
		<Screen
			bodyStyle={styles.body}
			dock={
				<PrimaryButton
					disabled={!ready}
					label="Next"
					onPress={next}
					tone={ready ? "sun" : "off"}
				/>
			}
			title="Who's the hero?"
		>
			<TextField
				autoCapitalize="words"
				autoComplete="off"
				autoCorrect={false}
				label="Name"
				onChangeText={setName}
				returnKeyType="done"
				value={name}
			/>
			<Group label="Boy or girl">
				<View style={styles.row}>
					<ChoiceTile
						label="Girl"
						onPress={() => setKind("girl")}
						selected={kind === "girl"}
						style={styles.flex}
					/>
					<ChoiceTile
						label="Boy"
						onPress={() => setKind("boy")}
						selected={kind === "boy"}
						style={styles.flex}
					/>
				</View>
			</Group>
			<Group label="Age" style={styles.age}>
				<View style={styles.chips}>
					{ageRows.map((row) => (
						<View key={row[0]} style={styles.chipRow}>
							{row.map((n) => (
								<Chip
									key={n}
									label={String(n)}
									onPress={() => setAge(n)}
									selected={age === n}
									style={styles.flex}
								/>
							))}
						</View>
					))}
				</View>
			</Group>
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
