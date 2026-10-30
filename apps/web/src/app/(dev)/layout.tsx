import type { Metadata } from "next";
import "../../index.css";
import Header from "@/components/header";
import Providers from "@/components/providers";

export const metadata: Metadata = {
	robots: { follow: false, index: false },
	title: "Developer dashboard",
};

export default function DevLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<Providers>
			<div className="grid h-svh grid-rows-[auto_1fr] antialiased">
				<Header />
				{children}
			</div>
		</Providers>
	);
}
