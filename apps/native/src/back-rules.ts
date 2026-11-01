// Screens where back makes no sense: the app's first screens, whatever is under them in the stack
// (Home is also reached by replacing the screens that came before it).
const NO_BACK = new Set(["index", "welcome", "hello", "home"]);

/** Whether a screen shows the back button. */
export const showsBack = (routeName: string, canGoBack: boolean): boolean =>
	canGoBack && !NO_BACK.has(routeName);
