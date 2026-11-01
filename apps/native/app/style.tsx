import { PrimaryButton } from "@little-adventures/native-ui/button";
import { LookTile } from "@little-adventures/native-ui/look-tile";
import { Screen } from "@little-adventures/native-ui/screen";
import { select } from "@little-adventures/native-ui/tokens";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { VideoConfirm } from "@/src/admin/live-confirm";
import { isAdminMe } from "@/src/admin/use-is-admin";
import { useMe } from "@/src/admin/use-me";
import type { Style } from "@/src/data/engine-client";
import { setStepsOptions } from "@/src/data/engine-queries";

const looks: { label: string; picture: number; style: Style }[] = [
	{
		label: "Clay",
		picture: require("../assets/styles/clay.jpg"),
		style: "clay",
	},
	{
		label: "Felt",
		picture: require("../assets/styles/felt.jpg"),
		style: "felt",
	},
	{
		label: "Wood",
		picture: require("../assets/styles/wood.jpg"),
		style: "wood",
	},
];

/** Before an adventure starts: how should it be drawn. Reached from the check screen and Home's ideas. */
export default function StylePicker() {
	const router = useRouter();
	// An idea from Home brings its question; the child's own words wait on the device.
	const { question } = useLocalSearchParams<{ question?: string }>();
	const me = useMe();
	const client = useQueryClient();
	const steps = useMutation(setStepsOptions(client));
	const [picked, setPicked] = useState<Style>("clay");
	const [confirming, setConfirming] = useState(false);
	// Video is the costly step: an admin with video clips on chooses first.
	const asksFirst = isAdminMe(me) && me?.steps.video === true;
	const go = () =>
		router.replace({
			params: question ? { question, style: picked } : { style: picked },
			pathname: "/making",
		});
	const start = () => (asksFirst ? setConfirming(true) : go());

	return (
		<View style={styles.root}>
			<Screen
				bodyStyle={styles.body}
				dock={<PrimaryButton label="Start" onPress={start} />}
				title={"How\nshould it look?"}
			>
				<View style={styles.row}>
					{looks.map(({ label, picture, style }) => (
						<LookTile
							key={style}
							label={label}
							onPress={() => setPicked(style)}
							picture={picture}
							selected={picked === style}
							style={styles.flex}
						/>
					))}
				</View>
			</Screen>
			{confirming ? (
				<VideoConfirm
					onCancel={() => setConfirming(false)}
					// The engine reads the switches when the adventure starts, so wait for the save.
					onNoVideo={() => steps.mutate({ video: false }, { onSuccess: go })}
					onVideo={go}
				/>
			) : null}
		</View>
	);
}

const styles = StyleSheet.create({
	body: { paddingTop: 34 },
	flex: { flex: 1 },
	root: { flex: 1 },
	row: { flexDirection: "row", gap: select.lookRowGap },
});
