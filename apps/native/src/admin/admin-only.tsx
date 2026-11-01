import { colors } from "@little-adventures/native-ui/tokens";
import type { ReactNode } from "react";
import { View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { isAdminMe } from "./use-is-admin";
import { useMe } from "./use-me";

const CROWN = 18;

/**
 * Renders its children only for admins, with a small yellow crown at the top right to mark
 * them as admin-only. Nothing shows for anyone else, or while the engine has not answered.
 */
export function AdminOnly({
	children,
	crown = true,
}: {
	children: ReactNode;
	/** False for a full-screen overlay that should not wear the crown. */
	crown?: boolean;
}) {
	const me = useMe();
	if (!isAdminMe(me)) {
		return null;
	}
	if (!crown) {
		return <>{children}</>;
	}
	return (
		<View>
			{children}
			<View
				accessibilityLabel="Admin only"
				pointerEvents="none"
				role="img"
				style={{ position: "absolute", right: 0, top: -CROWN / 2 }}
			>
				<Svg height={CROWN} viewBox="0 0 24 24" width={CROWN}>
					<Path
						d="M3.5 18.5l-1-11 5.5 4.5L12 5l4 7 5.5-4.5-1 11z"
						fill={colors.sun}
						stroke={colors.inkNavy}
						strokeLinejoin="round"
						strokeWidth={2}
					/>
				</Svg>
			</View>
		</View>
	);
}
