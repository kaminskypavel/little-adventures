import type { Metadata, Viewport } from "next";
import { dictionaries } from "@/i18n/dictionaries";
import { LANGUAGES } from "@/i18n/languages";
import "./landing.css";

// Search and share text, kept inside what Google and social previews show in full:
// title up to 60 characters, share description up to 125, meta description up to 160.
const { description, ogLocale, shareDescription, title } = dictionaries.en.meta;

// The address search engines and shares should use. The bare domain redirects here, and
// Vercel's production-domain variable picks the shortest domain, so it is set by hand.
const SITE_URL = "https://www.littleadventures.app";

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
