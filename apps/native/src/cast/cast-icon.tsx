import { View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

// The Cast glyph in the app's icon family: 24 grid, round caps, 2.3 stroke.
export function CastIcon({ color, size }: { color: string; size: number }) {
	return (
		// The wrapping View is positioned, so the icon paints above the clay layers on web.
		<View pointerEvents="none" style={{ height: size, width: size }}>
			<Svg height={size} viewBox="0 0 24 24" width={size}>
				<Path
					d="M3 7V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-5M3 12a9 9 0 0 1 9 9M3 16.5A4.5 4.5 0 0 1 7.5 21"
					fill="none"
					stroke={color}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={2.3}
				/>
				<Circle cx={3.6} cy={20.4} fill={color} r={1.4} />
			</Svg>
		</View>
	);
}
