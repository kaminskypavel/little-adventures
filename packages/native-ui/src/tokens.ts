// Design tokens for the Little Adventures app. Sizes are points (1 pt = 1 RN unit).

export const colors = {
	cream: "#F4ECD8",
	deepNavy: "#1B3560",
	drawingHi: "#A5BCA5",
	drawingLo: "#88A288",
	fieldHi: "#F8EED1",
	fieldLo: "#EADDB8",
	fieldNavy: "#16294F",
	goalBackdrop: "#3A5D78",
	hillHi: "#8DBB78",
	hillLo: "#4C7C49",
	hillMid: "#5F9358",
	inkNavy: "#12254A",
	lockedHi: "#B3C3C3",
	lockedLo: "#9CB0B0",
	medalHi: "#F8ECC4",
	medalLo: "#E8D5A0",
	namePill: "rgba(18,37,74,0.78)",
	nowWordInk: "#1C1A10",
	offHi: "#B9C6BC",
	offInk: "#37504A",
	offLo: "#A5B4A9",
	offOrb: "#667A72",
	plateDark: "rgba(14,28,56,0.88)",
	puppyDisc: "#CFE0CB",
	sage: "#B9CDB4",
	sageHi: "#C9DAC3",
	sageLo: "#B0C6AA",
	sand: "#F1E2B8",
	scrim: "rgba(10,22,44,0.5)",
	statusPill: "rgba(14,28,56,0.78)",
	sun: "#FFC83D",
	sunHi: "#FFD65E",
	sunLo: "#FFC12A",
	sunReadyLo: "#FFB91F",
} as const;

/** Clay face gradients, top to bottom. */
export const clayFaces = {
	drawing: [colors.drawingHi, colors.drawingLo],
	field: [colors.fieldHi, colors.fieldLo],
	locked: [colors.lockedHi, colors.lockedLo],
	medal: [colors.medalHi, colors.medalLo],
	off: [colors.offHi, colors.offLo],
	sage: [colors.sageHi, colors.sageLo],
	sun: [colors.sunHi, colors.sunLo],
	sunReady: [colors.sunHi, colors.sunReadyLo],
} as const;

export type ClayTone = keyof typeof clayFaces;

/** Sky gradients: color stops and their positions (0 to 1). */
export const skyPalettes = {
	night: {
		colors: ["#0A1430", "#14295A", "#26487F"],
		locations: [0, 0.5, 1],
	},
	puffy: {
		colors: ["#050B18", "#07152A", "#0C1F3C", "#112849", "#152E52"],
		locations: [0, 0.35, 0.62, 0.85, 1],
	},
	twilight: {
		colors: ["#1B2F63", "#2E4D8C", "#4268A4"],
		locations: [0, 0.5, 1],
	},
} as const;

export type SkyPalette = keyof typeof skyPalettes;

export const radii = {
	button: 44,
	card: 36,
	chip: 32,
	field: 30,
	full: 9999,
	heroCard: 50,
	plate: 17,
	tile: 32,
} as const;

export const spacing = {
	lg: 22,
	md: 14,
	sm: 8,
	xl: 36,
	xs: 4,
} as const;

export const layout = {
	baseHeight: 844,
	baseWidth: 390,
	dockBottom: 36,
	gap: 14,
	gapTight: 8,
	minTarget: 64,
	primaryHeight: 88,
	secondaryHeight: 80,
	sideMargin: 22,
	titleTop: 80,
	topBarHeight: 64,
	topBarOffset: 8,
	webColumnMax: 430,
} as const;

/** Nunito per weight, as loaded by expo-font. Swap the family here only. */
export const fonts = {
	body: "Nunito_700Bold",
	heavy: "Nunito_900Black",
	label: "Nunito_800ExtraBold",
} as const;

export const type = {
	body: { fontFamily: fonts.body, fontSize: 22, lineHeight: 28 },
	display: { fontFamily: fonts.heavy, fontSize: 58, lineHeight: 58 },
	headline: { fontFamily: fonts.heavy, fontSize: 39, lineHeight: 42 },
	label: { fontFamily: fonts.label, fontSize: 19, lineHeight: 23 },
	narration: { fontFamily: fonts.label, fontSize: 29, lineHeight: 36 },
	title: { fontFamily: fonts.heavy, fontSize: 29, lineHeight: 30 },
} as const;

export const shadows = {
	activeStone:
		"0px 0px 8px 0px rgba(255,200,60,1), 0px 0px 4px 0px rgba(255,200,60,0.9)",
	character: "0px 12px 10px 0px rgba(0,0,0,0.4)",
	clayLift:
		"inset 0px 4px 3px rgba(255,255,255,0.55), inset 0px -6px 0px rgba(0,0,0,0.15), 0px 11px 17px -8px rgba(0,0,0,0.55)",
	clayPressed:
		"inset 0px 4px 3px rgba(255,255,255,0.4), inset 0px -2px 0px rgba(0,0,0,0.15), 0px 4px 8px -6px rgba(0,0,0,0.5)",
	medallion: "0px 6px 8px -3px rgba(0,0,0,0.5)",
	stone: "0px 3px 2px 0px rgba(10,25,45,0.5)",
	walker: "0px 8px 7px 0px rgba(0,0,0,0.4)",
} as const;

export const motion = {
	easeOut: [0.22, 1, 0.36, 1],
	enter: 280,
	enterRise: 14,
	enterStagger: 60,
	exit: 160,
	holdGate: 3000,
	holdReset: 200,
	hop: 2800,
	hopHeight: 7,
	overshoot: [0.2, 0.9, 0.3, 1.2],
	press: 100,
	pressScale: 0.97,
	pressTranslate: 4,
	pulse: 1120,
	pulseOffset: 1000,
	pulsePeak: 1.04,
	reducedPress: 60,
	reducedReveal: 200,
	release: 220,
	releaseOvershoot: 1.02,
	select: 160,
	shimmer: 1900,
	walk: 1600,
} as const;
