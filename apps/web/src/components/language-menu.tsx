import { LocaleFlag } from "@/components/flags";
import { dictionaries, LOCALES, type Locale } from "@/i18n/dictionaries";

const HREF: Record<Locale, string> = {
	en: "/?lang=en",
	es: "/es",
	fr: "/fr",
};

// A flag dropdown on the native popover API: no state, no script. The links are plain pages,
// so each language is also reachable and crawlable without the menu. It sits top right on the
// same edge as the scene dots, so on very wide screens it stays inside the 16:9 story frame.
export function LanguageMenu({ current }: { current: Locale }) {
	const { label } = dictionaries[current].language;

	return (
		<>
			<button
				aria-label={label}
				className="text-cream fixed top-[max(16px,2.2vw)] right-[max(16px,2.2vw)] z-[6] flex cursor-pointer items-center gap-2 rounded-full bg-[rgba(5,11,24,0.55)] px-3.5 py-2 text-[15px] max-[899px]:top-4 max-[899px]:right-2.5 max-[899px]:px-3 max-[899px]:py-1.5 max-[899px]:text-[14px] [@media(min-aspect-ratio:16/9)]:right-[calc((100vw-177.78vh)/2+2vw)]"
				popoverTarget="language-menu"
				type="button"
			>
				<LocaleFlag locale={current} />
				<span aria-hidden="true">{current.toUpperCase()}</span>
			</button>
			<div
				className="text-cream fixed inset-auto top-[calc(max(16px,2.2vw)+48px)] right-[max(16px,2.2vw)] m-0 rounded-2xl bg-[rgba(5,11,24,0.92)] p-2 max-[899px]:top-[58px] max-[899px]:right-2.5 [@media(min-aspect-ratio:16/9)]:right-[calc((100vw-177.78vh)/2+2vw)]"
				id="language-menu"
				popover="auto"
			>
				<ul className="m-0 flex list-none flex-col p-0">
					{LOCALES.map((locale) => (
						<li key={locale}>
							<a
								aria-current={locale === current ? "page" : undefined}
								className="hover:bg-cream/10 flex items-center gap-3 rounded-xl px-3 py-2.5 text-[16px]"
								href={HREF[locale]}
								hrefLang={locale}
								lang={locale}
							>
								<LocaleFlag locale={locale} />
								<span className="flex-1 pr-4">
									{dictionaries[locale].language.name}
								</span>
								<span
									aria-hidden="true"
									className={locale === current ? "text-sun" : "invisible"}
								>
									✓
								</span>
							</a>
						</li>
					))}
				</ul>
			</div>
		</>
	);
}
