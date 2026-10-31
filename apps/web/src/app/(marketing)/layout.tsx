import type { Metadata, Viewport } from "next";
import { dictionaries } from "@/i18n/dictionaries";
import { LANGUAGES } from "@/i18n/languages";
import "./landing.css";

// Search and share text, kept inside what Google and social previews show in full:
// title up to 60 characters, share description up to 125, meta description up to 160.
const { description, ogLocale, shareDescription, title } = dictionaries.en.meta;

// Vercel sets this to the production domain (the custom one once it is connected).
const SITE_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
	? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
	: "https://littleadventures.app";

export const metadata: Metadata = {
	alternates: { canonical: "/", languages: LANGUAGES },
	appleWebApp: { title: "Little Adventures" },
	applicationName: "Little Adventures",
	description,
	formatDetection: { telephone: false },
	metadataBase: new URL(SITE_URL),
	openGraph: {
		description: shareDescription,
		locale: ogLocale,
		siteName: "Little Adventures",
		title,
		type: "website",
		url: "/",
	},
	title,
	twitter: {
		card: "summary_large_image",
		description: shareDescription,
		title,
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
