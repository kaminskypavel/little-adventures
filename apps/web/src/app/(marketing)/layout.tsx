import type { Metadata, Viewport } from "next";
import "./landing.css";

const TAGLINE = "Stories that start with your child's curiosity.";
const DESCRIPTION = `${TAGLINE} Your child asks a question out loud, a small adventure grows from it with your child as the hero, and it always ends in goodnight.`;

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
		description: DESCRIPTION,
		locale: "en_US",
		siteName: "Little Adventures",
		title: "Little Adventures: stories that start with your child's curiosity",
		type: "website",
		url: "/",
	},
	title: "Little Adventures: stories that start with your child's curiosity",
	twitter: {
		card: "summary_large_image",
		description: DESCRIPTION,
		title: "Little Adventures: stories that start with your child's curiosity",
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
