import type { ReactNode } from "react";
import { type StyleProp, View, type ViewStyle } from "react-native";
import { EaseView } from "react-native-ease";
import { useCalm } from "./motion-provider";
import { motion } from "./tokens";

/**
 * Star and puppy bob: up 7 pt and back, 2800 ms, forever. Still under reduced motion. Runs on the
 * platform's own animator (react-native-ease), so a hop that never ends costs no per-frame work.
 */
export function Hop({
	children,
	style,
}: {
	children: ReactNode;
	style?: StyleProp<ViewStyle>;
}) {
	const calm = useCalm();
	if (calm) {
		return <View style={style}>{children}</View>;
	}
	return (
		<EaseView
			animate={{ translateY: -motion.hopHeight }}
			initialAnimate={{ translateY: 0 }}
			style={style}
			transition={{
				duration: motion.hop / 2,
				easing: "easeInOut",
				loop: "reverse",
				type: "timing",
			}}
		>
			{children}
		</EaseView>
	);
}
