import type { Metadata, Viewport } from "next";
import "./landing.css";

const TAGLINE = "Bedtime stories that start with your child's own questions.";
const DESCRIPTION = `${TAGLINE} Your child asks out loud, a short illustrated story grows from it starring your child, with real answers on the way and a calm goodnight at the end.`;

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
		title:
			"Little Adventures: bedtime stories that start with your child's own questions",
		type: "website",
		url: "/",
	},
	title:
		"Little Adventures: bedtime stories that start with your child's own questions",
	twitter: {
		card: "summary_large_image",
		description: DESCRIPTION,
		title:
			"Little Adventures: bedtime stories that start with your child's own questions",
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
