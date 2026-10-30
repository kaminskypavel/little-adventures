import { useState } from "react";
import { View } from "react-native";
import { Chip } from "./chip";
import { ChoiceTile } from "./choice-tile";
import { ClayText } from "./clay-text";
import { LookTile } from "./look-tile";
import { TextField } from "./text-field";
import { ToggleCard } from "./toggle-card";
import { colors, layout, select } from "./tokens";

const ages = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const looks = ["Clay", "Felt", "Wood"];
const photoActions = ["Edit", "Redraw", "Delete photo"];

function Caption({ children }: { children: string }) {
	return (
		<ClayText color={colors.cream} style={{ opacity: 0.85 }} variant="label">
			{children}
		</ClayText>
	);
}

function Item({
	children,
	label,
}: {
	children: React.ReactNode;
	label: string;
}) {
	return (
		<View style={{ gap: layout.gapTight }}>
			<Caption>{label}</Caption>
			{children}
		</View>
	);
}

function Row({ children }: { children: React.ReactNode }) {
	return (
		<View style={{ flexDirection: "row", gap: layout.gapTight }}>
			{children}
		</View>
	);
}

/** Dev-only gallery: chips, tiles, toggle cards and the text field in every state. */
export function KitSelect() {
	const [age, setAge] = useState(5);
	const [who, setWho] = useState("Girl");
	const [look, setLook] = useState("Clay");
	const [you, setYou] = useState(false);
	const [puppy, setPuppy] = useState(true);
	const [name, setName] = useState("Noa");
	const [empty, setEmpty] = useState("");

	return (
		<View style={{ gap: layout.gap }}>
			<ClayText color={colors.cream} variant="title">
				Selection and field
			</ClayText>

			<Item label="age chips 2 to 11, 5 selected">
				<View style={{ gap: layout.gapTight }}>
					{[ages.slice(0, 5), ages.slice(5)].map((row) => (
						<Row key={row[0]}>
							{row.map((n) => (
								<Chip
									key={n}
									label={String(n)}
									onPress={() => setAge(n)}
									selected={age === n}
									style={{ flex: 1 }}
								/>
							))}
						</Row>
					))}
				</View>
			</Item>

			<Item label="label chips (Edit, Redraw, Delete photo)">
				<Row>
					{photoActions.map((label) => (
						<Chip
							key={label}
							label={label}
							size="label"
							style={{ flex: label === "Delete photo" ? 1.6 : 1 }}
						/>
					))}
				</Row>
			</Item>

			<Item label="choice tiles, Girl selected">
				<View style={{ flexDirection: "row", gap: layout.gap }}>
					{["Girl", "Boy"].map((label) => (
						<ChoiceTile
							key={label}
							label={label}
							onPress={() => setWho(label)}
							selected={who === label}
							style={{ flex: 1 }}
						/>
					))}
				</View>
			</Item>

			<Item label="look tiles, Clay selected, no picture">
				<View style={{ flexDirection: "row", gap: select.lookRowGap }}>
					{looks.map((label) => (
						<LookTile
							key={label}
							label={label}
							onPress={() => setLook(label)}
							picture={null}
							selected={look === label}
							style={{ flex: 1 }}
						/>
					))}
				</View>
			</Item>

			<Item label="toggle cards, You off, Puppy on (tap them)">
				<View style={{ gap: layout.gap }}>
					<ToggleCard
						avatar="you"
						on={you}
						onPress={() => setYou((v) => !v)}
						subtitle="Add a photo"
						title="You"
					/>
					<ToggleCard
						avatar="puppy"
						on={puppy}
						onPress={() => setPuppy((v) => !v)}
						subtitle="Best friend"
						title="Puppy"
					/>
				</View>
			</Item>

			<Item label="text field with a value (tap to focus)">
				<TextField label="Name" onChangeText={setName} value={name} />
			</Item>

			<Item label="text field with an error">
				<TextField
					error="Please add a name"
					label="Name"
					onChangeText={setEmpty}
					value={empty}
				/>
			</Item>
		</View>
	);
}
