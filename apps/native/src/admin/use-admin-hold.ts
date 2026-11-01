import { useAdminPanel } from "./admin-panel-store";
import { isAdminMe } from "./use-is-admin";
import { useMe } from "./use-me";

/** What a 1 s hold on a screen title does: opens the admin switches for admins, nothing for anyone else. */
export function useAdminHold(): (() => void) | null {
	const me = useMe();
	const setOpen = useAdminPanel((s) => s.setOpen);
	return isAdminMe(me) ? () => setOpen(true) : null;
}
