import { createContext, type ReactNode, useContext } from "react";
import { useReducedMotion } from "react-native-reanimated";

const CalmContext = createContext<boolean | null>(null);

/** Reads the system reduced-motion setting once, at the root. */
export function MotionProvider({ children }: { children: ReactNode }) {
	const calm = useReducedMotion();
	return <CalmContext.Provider value={calm}>{children}</CalmContext.Provider>;
}

/** True when the grown-up asked for reduced motion. Works without a provider too. */
export function useCalm(): boolean {
	const fromProvider = useContext(CalmContext);
	const fromSystem = useReducedMotion();
	return fromProvider ?? fromSystem;
}
