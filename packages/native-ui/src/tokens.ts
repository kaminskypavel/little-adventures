// Design tokens for the Little Adventures app. Sizes are points (1 pt = 1 RN unit).

export const colors = {
	caret: "#E8A400",
	cream: "#F4ECD8",
	deepNavy: "#1B3560",
	drawingHi: "#A5BCA5",
	drawingLo: "#88A288",
	fieldBorder: "rgba(18,37,74,0.14)",
	fieldFill: "#F1E6C6",
	fieldHi: "#F8EED1",
	fieldLo: "#EADDB8",
	fieldNavy: "#16294F",
	fieldPlaceholder: "rgba(18,37,74,0.35)",
	fieldRing: "rgba(255,200,61,0.38)",
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
	offIcon: "#E9EFE6",
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
	star: "#FFFFFF",
	statusPill: "rgba(14,28,56,0.78)",
	sun: "#FFC83D",
	sunHi: "#FFD65E",
	sunLo: "#FFC12A",
	sunReadyLo: "#FFB91F",
	toggleOff: "rgba(18,37,74,0.14)",
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
	dockBottom: 16,
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
	buttonSecondary: { fontFamily: fonts.heavy, fontSize: 26, lineHeight: 28 },
	display: { fontFamily: fonts.heavy, fontSize: 58, lineHeight: 58 },
	fieldError: { fontFamily: fonts.body, fontSize: 19, lineHeight: 23 },
	fieldLong: { fontFamily: fonts.label, fontSize: 24, lineHeight: 30 },
	headline: { fontFamily: fonts.heavy, fontSize: 39, lineHeight: 42 },
	headlineLong: { fontFamily: fonts.heavy, fontSize: 37, lineHeight: 40 },
	heroLabel: { fontFamily: fonts.heavy, fontSize: 36, lineHeight: 37 },
	label: { fontFamily: fonts.label, fontSize: 19, lineHeight: 23 },
	lookLabel: { fontFamily: fonts.heavy, fontSize: 21, lineHeight: 24 },
	narration: { fontFamily: fonts.label, fontSize: 29, lineHeight: 36 },
	title: { fontFamily: fonts.heavy, fontSize: 29, lineHeight: 30 },
	toggleSubtitle: { fontFamily: fonts.body, fontSize: 19, lineHeight: 23 },
	toggleTitle: { fontFamily: fonts.heavy, fontSize: 30, lineHeight: 31.5 },
} as const;

export const shadows = {
	activeStone:
		"0px 0px 8px 0px rgba(255,200,60,1), 0px 0px 4px 0px rgba(255,200,60,0.9)",
	character: "0px 12px 10px 0px rgba(0,0,0,0.4)",
	clayLift:
		"inset 0px 4px 3px rgba(255,255,255,0.55), inset 0px -6px 0px rgba(0,0,0,0.15), 0px 11px 17px -8px rgba(0,0,0,0.55)",
	clayPressed:
		"inset 0px 4px 3px rgba(255,255,255,0.4), inset 0px -2px 0px rgba(0,0,0,0.15), 0px 4px 8px -6px rgba(0,0,0,0.5)",
	fieldRing: "0px 0px 0px 4px rgba(255,200,61,0.38)",
	fieldWell:
		"inset 0px 3px 7px rgba(18,37,74,0.3), inset 0px -2px 0px rgba(255,255,255,0.55)",
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

/** Clay lift as numbers, so the lip can be tweened. Same values as `shadows.clayLift` and `shadows.clayPressed`. */
export const clayShadow = {
	down: {
		dropAlpha: 0.5,
		dropBlur: 8,
		dropSpread: -6,
		dropY: 4,
		highlight: 0.4,
		highlightY: 2,
		lip: 2,
		lipAlpha: 0.15,
	},
	rest: {
		dropAlpha: 0.55,
		dropBlur: 17,
		dropSpread: -8,
		dropY: 11,
		highlight: 0.55,
		highlightY: 4,
		lip: 6,
		lipAlpha: 0.15,
	},
} as const;

/** Reduced-motion press: the face darkens by this much instead of moving. */
export const reducedPressDarken = 0.07;

/** Web focus-visible ring. */
export const focusRing = { offset: 3, width: 3 } as const;

export const iconSizes = { button: 30, hero: 50 } as const;

/**
 * Button sizes, like Tailwind's sm / md / lg. lg is the child-sized default (88 primary, 80
 * secondary); md suits grown-up screens; sm is for compact tools such as the admin sheet.
 */
export const buttonSizes = {
	lg: { gap: 14, icon: 30, primary: 88, secondary: 80 },
	md: { gap: 12, icon: 24, primary: 64, secondary: 64 },
	sm: { gap: 8, icon: 18, primary: 44, secondary: 44 },
} as const;
export type ButtonSize = keyof typeof buttonSizes;

/** New adventure / Ask your own card. */
export const heroCard = {
	gap: 20,
	height: 184,
	orb: 100,
	padX: 28,
} as const;

/** Flat pieces (plates, panels, bars). Never clay, never lifted, never tappable. */
export const flat = {
	found: {
		dot: 12,
		dotLeft: 3,
		indent: 25,
		itemLine: 1.2,
		itemPadY: 4,
		itemSize: 20,
		padBottom: 19,
		padTop: 17,
		padX: 25,
		radius: 36,
		titleGap: 4,
		titleSize: 24,
	},
	holdGate: {
		box: 233,
		core: 164,
		coreIcon: 61,
		stroke: 14,
		track: "rgba(244,236,216,0.22)",
	},
	namePill: { padBottom: 6, padTop: 4, padX: 19, radius: 28 },
	narration: {
		chipPadX: 7,
		chipRadius: 11,
		padBottom: 22,
		padTop: 19,
		padX: 22,
		radius: 36,
		trackGap: 19,
		trackHeight: 14,
		trackRadius: 7,
		trackTint: "rgba(244,236,216,0.2)",
		upcoming: 0.5,
		wordGap: 8,
	},
	plate: {
		big: { height: 44, padX: 25, radius: 22, size: 25 },
		icon: 17,
		iconGap: 6,
		place: { height: 33, padX: 15, radius: 17, size: 18 },
		question: {
			lineHeight: 1.15,
			maxWidth: 340,
			padBottom: 8,
			padTop: 7,
			padX: 19,
			radius: 25,
			size: 21,
		},
	},
	progress: { height: 17, radius: 8.5, track: "rgba(14,28,56,0.7)" },
	questionCard: {
		lineHeight: 1.1,
		minHeight: 208,
		padX: 31,
		padY: 28,
		radius: 42,
		size: 44,
	},
	statusPill: { fade: 200, padBottom: 6, padTop: 4, padX: 19, radius: 19 },
} as const;

/** Chips, choice and look tiles, toggle cards and the text field. */
export const select = {
	chipHeight: 64,
	choiceHeight: 88,
	fieldBorder: 2,
	fieldHeight: 80,
	fieldLabelGap: 8,
	fieldPadX: 28,
	focus: 160,
	lookGap: 7,
	lookHeight: 162,
	lookRowGap: 10,
	lookThumb: 84,
	toggleAvatar: 86,
	toggleCheck: 28,
	toggleColor: 250,
	toggleDisc: 47,
	toggleFade: 150,
	toggleGap: 17,
	toggleHeight: 122,
	toggleIcon: 50,
	togglePadLeft: 19,
	togglePadRight: 22,
	togglePop: 220,
	toggleTextGap: 3,
} as const;

/** List rows, picture rows and choice cards. */
export const listCards = {
	choice: {
		chipBottom: 21,
		chipFont: 25,
		chipGap: 6,
		chipPadBottom: 6,
		chipPadTop: 4,
		chipPadX: 22,
		chipRadius: 22,
		dim: "rgba(14,28,56,0.55)",
		drawingBlur: 4,
		drawingBrightnessVeil: "rgba(0,0,0,0.15)",
		drawingGrayVeil: "rgba(140,140,140,0.5)",
		goalHeight: "94%",
		goalPadRight: "36%",
		height: 250,
		heightTight: 219,
		lockBadge: {
			icon: 39,
			right: "15%",
			shadow: "0px 8px 11px -6px rgba(0,0,0,0.5)",
			size: 78,
			// round 7: top 50%, translated up by 62% of its own height
			up: 0.62,
		},
		lockedGrayVeil: "rgba(140,140,140,0.25)",
		pad: 7,
		radius: 42,
		ringOffset: 5,
		ringRadius: 47,
		ringRestScale: 0.94,
		ringWidth: 4,
		selectFade: 150,
		selectPop: 250,
		// translateX 0, -6, +6, -2, 0 over 300 ms (keys at 25, 55, 80, 100 percent).
		shakeSegments: [
			{ ms: 75, x: -6 },
			{ ms: 90, x: 6 },
			{ ms: 75, x: -2 },
			{ ms: 60, x: 0 },
		],
		shimmer: "rgba(255,255,255,0.55)",
		shimmerClear: "rgba(255,255,255,0)",
		shimmerTilt: "15deg",
	},
	list: {
		captionFont: 17,
		captionLine: 21,
		captionOpacity: 0.7,
		gap: 17,
		height: 94,
		padLeft: 13.5,
		padRight: 22,
		pictureHeight: 67,
		pictureRadius: 19,
		pictureWidth: 83,
		radius: 42,
		titleFont: 22,
		titleLine: 26,
	},
	pictureRow: {
		gap: 17,
		height: 128,
		padBottom: 11,
		padLeft: 11,
		padRight: 19,
		padTop: 11,
		picture: 106,
		pictureRadius: 28,
		radius: 39,
		titleFont: 24,
		titleLine: 27,
	},
	row: {
		countFont: 22,
		countLine: 26,
		countPadBottom: 3,
		countPadTop: 1,
		countPadX: 14,
		countPill: "rgba(18,37,74,0.14)",
		countRadius: 17,
		padLeft: 14,
		picture: 67,
		subtitleFont: 17,
	},
} as const;

/** Map medallion: round, tappable place picture. The ring is the clay padding around the disc. */
export const mapMedallion = {
	badge: 31,
	badgeIcon: 19,
	badgeOffset: -4,
	badgeShadow: "0px 3px 4px rgba(0,0,0,0.4)",
	/** Drawing state: the blur is expo-image `blurRadius`, the gray veil stands in for grayscale. */
	drawingBlur: 4,
	drawingVeil: "rgba(120,130,125,0.35)",
	iconRatio: 0.35,
	ring: 4,
	ringActive: 5.5,
	size: 86,
	sizeHere: 97,
} as const;

/** Map stepping stone: a pebble cut-out with a shape-following shadow, and the one glow in the design system. */
export const mapStone = {
	glow: "rgb(255,200,60)",
	glowBlur: 6,
	glowFade: 250,
	glowScale: 1.15,
	/** The tight second halo, as in `shadows.activeStone`. */
	glowTightAlpha: 0.9,
	glowTightBlur: 3,
	/** Opacity of the sun veil over the active stone, standing in for saturate and brightness. */
	lift: 0.28,
	shadow: "rgba(10,25,45,0.5)",
	shadowBlur: 1.5,
	shadowOffset: 3,
} as const;

/**
 * Story cover (Home idea shelf, Library grid): a picture with a sand plate over it, clay raised.
 * The shelf cover is fixed width and scrolls sideways; the grid cover fills its column.
 */
export const storyCover = {
	captionFont: 13,
	captionGap: 2,
	captionOpacity: 0.75,
	check: {
		disc: 40,
		icon: 24,
		inset: 12,
		shadow: "0px 3px 5px rgba(0,0,0,0.4)",
	},
	grid: {
		height: 250,
		plateBottomPad: 7,
		plateTopPad: 6,
		titleFont: 17,
	},
	lineHeight: 1.1,
	pad: 6,
	pictureRadius: 30,
	plate: { bottom: 15, inset: 14, padX: 8, radius: 17 },
	radius: 36,
	shelf: {
		gap: 12,
		height: 276,
		plateBottomPad: 8,
		plateTopPad: 7,
		/** Room under the covers so the scroll view does not clip the clay drop shadow. */
		shadowRoom: 24,
		titleFont: 15.5,
		width: 150,
	},
} as const;

/** Home's two shelves: arched doors for the child's adventures, round pictures for ideas. */
export const homeShelf = {
	door: {
		chip: { bottom: -10, height: 24, leaf: 15, leafGap: 3, padX: 7 },
		gap: 14,
		height: 96,
		innerRadius: { bottom: 13, top: 35 },
		offLeaf: 0.3,
		pad: 5,
		radius: { bottom: 18, top: 40 },
		slot: { border: 3, color: "rgba(244,236,216,0.32)", icon: 30 },
		width: 80,
	},
	idea: { gap: 12, pad: 5, size: 88 },
} as const;

/** The star's speech plate on Home: sand, a tail pointing down at the star. */
export const speechPlate = {
	maxWidth: 300,
	padX: 22,
	padY: 14,
	radius: 28,
	tail: 14,
	type: { fontFamily: fonts.heavy, fontSize: 26, lineHeight: 30 },
} as const;
