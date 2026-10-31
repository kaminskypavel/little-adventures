import type { Principal } from "@little-adventures/auth";
import type { Database } from "@little-adventures/db";
import type { ImageEditing } from "@little-adventures/image-editing";
import type { Storage } from "@little-adventures/storage";

export interface Context {
	/** Model calls that find and redraw the child in a photo. */
	art: ImageEditing;
	db: Database;
	/** The signed-in grown-up, or null for a visitor. */
	principal: Principal | null;
	storage: Storage;
	/** Keeps the work running after the response is sent. */
	waitUntil: (work: Promise<unknown>) => void;
}
