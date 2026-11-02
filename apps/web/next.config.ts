import { varlockNextConfigPlugin } from "@varlock/nextjs-integration/plugin";
import type { NextConfig } from "next";

const withVarlock = varlockNextConfigPlugin();

const nextConfig: NextConfig = {
	reactCompiler: true,
	// The kids app is a single-page web export in public/web: any of its routes loads its page.
	rewrites: async () => ({
		afterFiles: [],
		beforeFiles: [],
		fallback: [
			{ destination: "/web/index.html", source: "/web" },
			{ destination: "/web/index.html", source: "/web/:path*" },
		],
	}),
	// The workspace packages are compiled with the app, so next dev reloads on their changes too.
	transpilePackages: [
		"@little-adventures/api",
		"@little-adventures/auth",
		"@little-adventures/db",
		"@little-adventures/image-editing",
		"@little-adventures/storage",
		"@little-adventures/transcribe",
		"@little-adventures/ui",
		"@little-adventures/validation",
	],
	typedRoutes: true,
};

export default withVarlock(nextConfig);
