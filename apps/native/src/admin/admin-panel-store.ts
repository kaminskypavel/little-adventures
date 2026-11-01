import { create } from "zustand";

/** Open/closed state of the admin switches, shared by the floating button and the overlay. */
export const useAdminPanel = create<{
	open: boolean;
	setOpen: (open: boolean) => void;
}>((set) => ({ open: false, setOpen: (open) => set({ open }) }));
