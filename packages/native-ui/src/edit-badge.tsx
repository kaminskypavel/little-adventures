import { View } from "react-native";
import { Icon } from "./icons";
import { colors, flat } from "./tokens";

const badge = flat.editBadge;

/** A soft pencil mark for the bottom right of a face in edit mode. Not a button: the face is. */
export function EditBadge() {
	return (
		<View
			pointerEvents="none"
			style={{
				alignItems: "center",
				backgroundColor: badge.fill,
				borderRadius: badge.size / 2,
				bottom: badge.inset,
				boxShadow: `0px 0px 0px ${badge.ringWidth}px ${badge.ring}, 0px 6px 10px -6px rgba(0,0,0,0.6)`,
				height: badge.size,
				justifyContent: "center",
				position: "absolute",
				right: badge.inset,
				width: badge.size,
			}}
		>
			<Icon color={colors.cream} name="pencil" size={badge.icon} />
		</View>
	);
}
