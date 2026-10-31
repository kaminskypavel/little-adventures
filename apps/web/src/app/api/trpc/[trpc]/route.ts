import { appRouter } from "@little-adventures/api/routers/index";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import type { NextRequest } from "next/server";

import { preflight, withCors } from "@/server/cors";

import { createContext } from "../../../../context";

async function handler(req: NextRequest) {
	const response = await fetchRequestHandler({
		createContext: () => createContext(req),
		endpoint: "/api/trpc",
		req,
		router: appRouter,
	});
	return withCors(req, response);
}

export const OPTIONS = (req: NextRequest) => preflight(req);

export { handler as GET, handler as POST };
