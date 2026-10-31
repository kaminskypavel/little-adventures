import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { LandingPage } from "@/components/landing-page";
import { dictionaries, type Locale } from "@/i18n/dictionaries";
import { LANGUAGES } from "@/i18n/languages";

// English lives at "/"; every other language gets its own static page.
export const dynamicParams = false;

export function generateStaticParams() {
	return [{ lang: "es" }, { lang: "fr" }];
}

const other = (lang: string): lang is Exclude<Locale, "en"> =>
	lang === "es" || lang === "fr";

export async function generateMetadata(
	{ params }: PageProps<"/[lang]">,
	parent: ResolvingMetadata
): Promise<Metadata> {
	const { lang } = await params;
	if (!other(lang)) {
		notFound();
	}
	const { description, ogLocale, shareDescription, title } =
		dictionaries[lang].meta;
	// A child openGraph or twitter object replaces the parent's, so carry its share images over.
	const { openGraph, twitter } = await parent;
	return {
		alternates: { canonical: `/${lang}`, languages: LANGUAGES },
		description,
		openGraph: {
			description: shareDescription,
			images: openGraph?.images,
			locale: ogLocale,
			siteName: "Little Adventures",
			title,
			type: "website",
			url: `/${lang}`,
		},
		title,
		twitter: {
			card: "summary_large_image",
			description: shareDescription,
			images: twitter?.images,
			title,
		},
	};
}

export default async function LanguagePage({ params }: PageProps<"/[lang]">) {
	const { lang } = await params;
	if (!other(lang)) {
		notFound();
	}
	return <LandingPage locale={lang} />;
}
