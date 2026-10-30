import type { Metadata, Viewport } from "next";
import "./landing.css";

const TAGLINE = "Stories that start with your child's curiosity.";

export const metadata: Metadata = {
	description: `${TAGLINE} Your child asks out loud, an adventure grows from the question, and it always ends in goodnight.`,
	metadataBase: new URL("https://littleadventures.app"),
	openGraph: {
		description: TAGLINE,
		siteName: "Little Adventures",
		title: "Little Adventures",
		type: "website",
		url: "/",
	},
	title: "Little Adventures: stories that start with your child's curiosity",
	twitter: {
		card: "summary_large_image",
		description: TAGLINE,
		title: "Little Adventures",
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
