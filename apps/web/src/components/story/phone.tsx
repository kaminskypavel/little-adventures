import Image from "next/image";
import { type Beat, beats } from "./beats";

const ALL: readonly Beat[] = beats;
const SCREENS = ALL.filter((beat) => beat.screen);

// Placeholder screens, to be replaced by captures of the real app.
// One stacked layer per beat that has a screen; the timeline cross-fades
// them by data-screen.
export function Phone({ className }: { className?: string }) {
	return (
		<div
			aria-hidden="true"
			className={`bg-deep-navy shadow-character aspect-[390/844] rounded-[36px] p-2 md:rounded-[48px] md:p-2.5 ${className ?? ""}`}
			data-phone
		>
			<div
				className="@container relative size-full overflow-hidden rounded-[28px] md:rounded-[38px]"
				style={{ background: "var(--sky-puffy)" }}
			>
				{SCREENS.map((beat, index) => (
					<div
						className={`absolute inset-0 flex flex-col items-center gap-[3cqw] px-[8cqw] pt-[24cqw] text-center ${index === 0 ? "" : "invisible opacity-0"}`}
						data-screen={beat.id}
						key={beat.id}
					>
						<span className="text-cream text-[9.5cqw] leading-tight font-black text-balance">
							{beat.screen?.title}
						</span>
						{beat.screen?.line ? (
							<span className="text-cream/80 text-[5.5cqw] leading-snug">
								{beat.screen.line}
							</span>
						) : null}
						{beat.screen?.still ? (
							<span className="absolute inset-0 flex items-center justify-center">
								<Image
									alt=""
									className="w-[46cqw]"
									data-still
									height={768}
									sizes="160px"
									src="/star/star-rest.webp"
									width={768}
								/>
							</span>
						) : null}
					</div>
				))}
			</div>
		</div>
	);
}
