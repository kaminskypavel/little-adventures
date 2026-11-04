import type { Database } from "@little-adventures/db";
import { sql } from "drizzle-orm";

/**
 * Every guest sign-in starts fresh: forgets which places the guest visited in
 * the adventures the guest owns. The adventure tables belong to the engine, so
 * this is plain SQL.
 */
export const resetGuestProgress = async (db: Database, guestId: string) => {
	await db.execute(
		sql`update public.adventure_nodes set visited_at = null where adventure_id in (select id from public.adventures where owner_id = ${guestId})`
	);
};
