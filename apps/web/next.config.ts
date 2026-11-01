import { varlockNextConfigPlugin } from "@varlock/nextjs-integration/plugin";
import type { NextConfig } from "next";

const withVarlock = varlockNextConfigPlugin();

const nextConfig: NextConfig = {
	reactCompiler: true,
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
