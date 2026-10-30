import { auth } from "@/server/auth";
import { preflight, withCors } from "@/server/cors";

const handlers = auth.handler();

type Context = Parameters<typeof handlers.GET>[1];

export const GET = async (request: Request, context: Context) =>
	withCors(request, await handlers.GET(request, context));

export const POST = async (request: Request, context: Context) =>
	withCors(request, await handlers.POST(request, context));

export const OPTIONS = (request: Request) => preflight(request);
