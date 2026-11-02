import type { ReactNode } from "react";
import { View } from "react-native";
import Svg, { Circle, G, Path, Rect } from "react-native-svg";
import { colors, iconSizes } from "./tokens";

export type IconName =
	| "back"
	| "camera"
	| "check"
	| "image"
	| "lock"
	| "map"
	| "mic"
	| "mic-off"
	| "pause"
	| "pencil"
	| "play"
	| "plus"
	| "sliders"
	| "user"
	| "x";

export const iconNames: readonly IconName[] = [
	"mic",
	"mic-off",
	"lock",
	"play",
	"pause",
	"pencil",
	"check",
	"map",
	"user",
	"camera",
	"image",
	"x",
	"plus",
	"back",
	"sliders",
];

// One family: 24 grid, round caps and joins. Stroke widths follow round 7.
const line = {
	fill: "none",
	strokeLinecap: "round",
	strokeLinejoin: "round",
} as const;

const micBody = (
	<>
		<Rect height={11.5} rx={3} width={6} x={9} y={3} />
		<Path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
	</>
);

const shapes: Record<IconName, (color: string) => ReactNode> = {
	back: (c) => (
		<Path d="M14.5 5.5L8 12l6.5 6.5" stroke={c} strokeWidth={3} {...line} />
	),
	camera: (c) => (
		<G stroke={c} strokeWidth={2.3} {...line}>
			<Path d="M4 8.5h3l1.5-2.5h7L17 8.5h3v10H4z" />
			<Circle cx={12} cy={13.3} r={3.3} />
		</G>
	),
	check: (c) => (
		<Path d="M5.5 12.5l4 4 9-9" stroke={c} strokeWidth={3.4} {...line} />
	),
	image: (c) => (
		<G stroke={c} strokeWidth={2.3} {...line}>
			<Rect height={14} rx={3} width={17} x={3.5} y={5} />
			<Circle cx={9} cy={10} r={1.6} />
			<Path d="M4 17l5-4.5 3.5 3L15 13l5 4.5" />
		</G>
	),
	lock: (c) => (
		<G stroke={c} strokeWidth={2.4} {...line}>
			<Rect height={10} rx={2.5} width={14} x={5} y={10.5} />
			<Path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
		</G>
	),
	map: (c) => (
		<G stroke={c} strokeWidth={2.4} {...line}>
			<Circle cx={6} cy={18} r={2.4} />
			<Circle cx={18} cy={6} r={2.4} />
			<Path d="M6 15.5c0-5 12-3 12-7.5" strokeDasharray="1 4.5" />
		</G>
	),
	mic: (c) => (
		<G stroke={c} strokeWidth={2.4} {...line}>
			{micBody}
		</G>
	),
	"mic-off": (c) => (
		<G stroke={c} strokeWidth={2.4} {...line}>
			{micBody}
			<Path d="M4 4l16 16" strokeWidth={2.8} />
		</G>
	),
	pause: (c) => (
		<G fill={c}>
			<Rect height={14} rx={1.6} width={4} x={6.5} y={5} />
			<Rect height={14} rx={1.6} width={4} x={13.5} y={5} />
		</G>
	),
	pencil: (c) => (
		<G stroke={c} strokeWidth={2.2} {...line}>
			<Path d="M5 19l1-4 9.5-9.5a2 2 0 0 1 3 3L9 18z" />
			<Path d="M14 7l3 3" />
		</G>
	),
	play: (c) => (
		<Path
			d="M8 5.5v13l10.5-6.5z"
			fill={c}
			stroke={c}
			strokeLinejoin="round"
			strokeWidth={2}
		/>
	),
	plus: (c) => (
		<Path d="M12 5v14M5 12h14" stroke={c} strokeWidth={3} {...line} />
	),
	sliders: (c) => (
		<G stroke={c} strokeWidth={2.4} {...line}>
			<Path d="M4 8h16M4 16h16" />
			<Circle cx={9} cy={8} fill={colors.cream} r={2.6} />
			<Circle cx={15} cy={16} fill={colors.cream} r={2.6} />
		</G>
	),
	user: (c) => (
		<G stroke={c} strokeWidth={2.4} {...line}>
			<Circle cx={12} cy={8.5} r={3.8} />
			<Path d="M4.5 20c.8-4 3.6-5.8 7.5-5.8s6.7 1.8 7.5 5.8" />
		</G>
	),
	x: (c) => (
		<Path d="M7 7l10 10M17 7L7 17" stroke={c} strokeWidth={2.6} {...line} />
	),
};

export function Icon({
	color = colors.inkNavy,
	name,
	size = iconSizes.button,
}: {
	color?: string;
	name: IconName;
	size?: number;
}) {
	return (
		// The wrapping View is positioned, so the icon paints above the clay layers on web.
		<View pointerEvents="none" style={{ height: size, width: size }}>
			<Svg height={size} viewBox="0 0 24 24" width={size}>
				{shapes[name](color)}
			</Svg>
		</View>
	);
}
