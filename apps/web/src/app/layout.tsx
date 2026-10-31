import localFont from "next/font/local";

// The brand font sits behind one variable, so a font change is a swap here only.
const brandFont = localFont({
	src: [
		{ path: "./fonts/nunito-700.woff2", weight: "700" },
		{ path: "./fonts/nunito-800.woff2", weight: "800" },
		{ path: "./fonts/nunito-900.woff2", weight: "900" },
	],
	variable: "--font-nunito",
});

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html className={brandFont.variable} lang="en" suppressHydrationWarning>
			<body>{children}</body>
		</html>
	);
}
