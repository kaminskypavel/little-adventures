import type { Context as ApiContext } from "@little-adventures/api/context";
import type { NextRequest } from "next/server";

import { db } from "./services";

export function createContext(_req: NextRequest): ApiContext {
	return {
		db,
	};
}

export type Context = ReturnType<typeof createContext>;
