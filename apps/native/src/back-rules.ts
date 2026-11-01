// Screens where back makes no sense: the app's first screens, whatever is under them in the stack
// (Home is also reached by replacing the screens that came before it).
const NO_BACK = new Set(["index", "welcome", "hello", "home"]);

/**
 * What the back button does: go back when there is a screen behind, go Home when there is none
 * (a reload or a link opened the screen directly), or nothing on the first screens.
 */
export const backTarget = (
	routeName: string,
	canGoBack: boolean
): "back" | "home" | null => {
	if (NO_BACK.has(routeName)) {
		return null;
	}
	return canGoBack ? "back" : "home";
};
