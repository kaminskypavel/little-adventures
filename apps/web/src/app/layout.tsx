import localFont from "next/font/local";
import Script from "next/script";

// The brand font sits behind one variable, so a font change is a swap here only.
const brandFont = localFont({
	src: [
		{ path: "./fonts/nunito-700.woff2", weight: "700" },
		{ path: "./fonts/nunito-800.woff2", weight: "800" },
		{ path: "./fonts/nunito-900.woff2", weight: "900" },
	],
	variable: "--font-nunito",
});

// Cloudflare Web Analytics: free, cookieless page views for www.littleadventures.app.
// The token is public by design: it ships in every page.
const ANALYTICS_BEACON = JSON.stringify({
	token: "0a4850c0ff5e4689bc28c27cf2c72d65",
});

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html className={brandFont.variable} lang="en" suppressHydrationWarning>
			<body>
				{children}
				{process.env.NODE_ENV === "production" && (
					<Script
						data-cf-beacon={ANALYTICS_BEACON}
						src="https://static.cloudflareinsights.com/beacon.min.js"
						strategy="afterInteractive"
					/>
				)}
			</body>
		</html>
	);
}
