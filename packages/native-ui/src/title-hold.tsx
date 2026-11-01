import { createContext, type ReactNode, useContext } from "react";
import { Pressable, type StyleProp, View, type ViewStyle } from "react-native";

/**
 * A hook the app supplies: it returns what a 1 s hold on a screen title does, or null when
 * the hold does nothing (everyone but admins). The kit knows nothing about admins.
 */
type UseHold = () => (() => void) | null;

const noHold: UseHold = () => null;
const HoldContext = createContext<UseHold>(noHold);

/** Gives every `Screen` and `TopBar` title below it a 1 s hold, wired to `useHold`. */
export function TitleHoldProvider({
	children,
	useHold,
}: {
	children: ReactNode;
	useHold: UseHold;
}) {
	return <HoldContext value={useHold}>{children}</HoldContext>;
}

/**
 * Wraps a title so a 1 s hold runs the app's action. Always one wrapper view, so the layout is
 * the same with or without an action.
 */
export function TitleHold({
	children,
	onTitleLongPress,
	style,
}: {
	children: ReactNode;
	/** Overrides the provider's action. */
	onTitleLongPress?: () => void;
	style?: StyleProp<ViewStyle>;
}) {
	const useHold = useContext(HoldContext);
	const action = useHold();
	const onLongPress = onTitleLongPress ?? action;
	if (!onLongPress) {
		return <View style={style}>{children}</View>;
	}
	return (
		<Pressable
			accessible={false}
			delayLongPress={1000}
			onLongPress={onLongPress}
			style={style}
		>
			{children}
		</Pressable>
	);
}
