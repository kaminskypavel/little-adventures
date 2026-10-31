import { nativeCallbackUrl } from "@little-adventures/auth/native-callback";

import { ENV } from "@/env.server";

// Neon Auth only accepts http(s) callbacks, so sign-in on a phone lands here
// and the browser is handed on to the app's URL scheme.
export const GET = (request: Request) =>
	new Response(null, {
		headers: {
			location: nativeCallbackUrl(
				ENV.NATIVE_APP_SCHEME,
				new URL(request.url).search
			),
		},
		status: 302,
	});
