import type { Locale } from "@/i18n/dictionaries";

// Small flat flags, 20x14, one per language.
function Flag({ children }: { children: React.ReactNode }) {
	return (
		<svg
			aria-hidden="true"
			className="shrink-0 overflow-hidden rounded-[3px]"
			height="14"
			viewBox="0 0 20 14"
			width="20"
		>
			{children}
		</svg>
	);
}

const US = (
	<Flag>
		<rect fill="#fff" height="14" width="20" />
		{[0, 4, 8, 12].map((y) => (
			<rect fill="#c8323c" height="2" key={y} width="20" y={y} />
		))}
		<rect fill="#2b3f8c" height="8" width="9" />
	</Flag>
);

const ES = (
	<Flag>
		<rect fill="#c8323c" height="14" width="20" />
		<rect fill="#f6c545" height="7" width="20" y="3.5" />
	</Flag>
);

const FR = (
	<Flag>
		<rect fill="#2b4fa3" height="14" width="7" />
		<rect fill="#fff" height="14" width="7" x="6.67" />
		<rect fill="#c8323c" height="14" width="7" x="13.33" />
	</Flag>
);

const FLAGS: Record<Locale, React.ReactNode> = { en: US, es: ES, fr: FR };

export function LocaleFlag({ locale }: { locale: Locale }) {
	return FLAGS[locale];
}
