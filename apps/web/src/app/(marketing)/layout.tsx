import type { Metadata, Viewport } from "next";
import "./landing.css";

// Search and share text, kept inside what Google and social previews show in full:
// title up to 60 characters, share description up to 125, meta description up to 160.
const TITLE = "Little Adventures: bedtime stories sparked by your child";
const SHARE_DESCRIPTION =
	"Your child asks a question out loud. A short illustrated story answers it, starring your child, then says goodnight.";
const DESCRIPTION =
	"Your child asks a question out loud. A short illustrated story answers it, starring your child, with real facts and a calm goodnight.";

// Vercel sets this to the production domain (the custom one once it is connected).
const SITE_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
	? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
	: "https://littleadventures.app";

export const metadata: Metadata = {
	alternates: { canonical: "/" },
	appleWebApp: { title: "Little Adventures" },
	applicationName: "Little Adventures",
	description: DESCRIPTION,
	formatDetection: { telephone: false },
	metadataBase: new URL(SITE_URL),
	openGraph: {
		description: SHARE_DESCRIPTION,
		locale: "en_US",
		siteName: "Little Adventures",
		title: TITLE,
		type: "website",
		url: "/",
	},
	title: TITLE,
	twitter: {
		card: "summary_large_image",
		description: SHARE_DESCRIPTION,
		title: TITLE,
	},
};

export const viewport: Viewport = {
	colorScheme: "dark",
	themeColor: "#050B18",
};

export default function MarketingLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return children;
}
