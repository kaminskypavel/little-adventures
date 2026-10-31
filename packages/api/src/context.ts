import type { Principal } from "@little-adventures/auth";
import type { Database } from "@little-adventures/db";
import type { Storage } from "@little-adventures/storage";

export interface Context {
	db: Database;
	/** The signed-in grown-up, or null for a visitor. */
	principal: Principal | null;
	storage: Storage;
}
