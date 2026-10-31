import sharp from "sharp";

export interface Box {
	x1: number;
	x2: number;
	y1: number;
	y2: number;
}

export interface Found {
	box: Box;
	/** 0/1, row-major, `maskHeight` rows of `maskWidth`, stretched over `box`. */
	mask: Uint8Array;
	maskHeight: number;
	maskWidth: number;
}

export const FACE_SIZE = 512;
/** How far the square starts above the box top, as a share of its side. */
const HEADROOM = 0.1;

/**
 * Square for a round avatar: side = the shorter box side, centered on the box
 * horizontally, starting a little above its top, clamped to the image.
 */
export function faceSquare(
	box: Box,
	imageWidth: number,
	imageHeight: number
): { left: number; side: number; top: number } {
	const boxWidth = box.x2 - box.x1;
	const boxHeight = box.y2 - box.y1;
	const side = Math.max(
		1,
		Math.floor(Math.min(boxWidth, boxHeight, imageWidth, imageHeight))
	);
	const center = (box.x1 + box.x2) / 2;
	const left = Math.round(
		Math.min(Math.max(0, center - side / 2), imageWidth - side)
	);
	const top = Math.round(
		Math.min(Math.max(0, box.y1 - side * HEADROOM), imageHeight - side)
	);
	return { left, side, top };
}

/**
 * The masked person on a transparent background, cropped square and resized to
 * 512 px. SAM's mask covers only its box, so it is stretched back over the box.
 */
export async function faceCutout(
	photo: Uint8Array,
	found: Found
): Promise<Uint8Array> {
	const { box, mask, maskHeight, maskWidth } = found;
	if (mask.length !== maskWidth * maskHeight) {
		throw new Error(
			`mask length ${mask.length} does not match ${maskWidth}x${maskHeight}`
		);
	}
	// rotate(): phone photos carry an EXIF orientation.
	const { data, info } = await sharp(photo)
		.rotate()
		.ensureAlpha()
		.raw()
		.toBuffer({ resolveWithObject: true });
	const { height, width } = info;

	const x1 = Math.max(0, Math.round(box.x1));
	const y1 = Math.max(0, Math.round(box.y1));
	const x2 = Math.min(width, Math.round(box.x2));
	const y2 = Math.min(height, Math.round(box.y2));
	const boxWidth = x2 - x1;
	const boxHeight = y2 - y1;
	if (boxWidth <= 0 || boxHeight <= 0) {
		throw new Error("box is empty after clamping to the photo");
	}

	// 0/1 to 0/255 so a nearest resize keeps a hard edge.
	const alphaSource = Buffer.from(mask.map((v) => (v ? 255 : 0)));
	const alpha =
		boxWidth === maskWidth && boxHeight === maskHeight
			? alphaSource
			: await sharp(alphaSource, {
					raw: { channels: 1, height: maskHeight, width: maskWidth },
				})
					.resize(boxWidth, boxHeight, { fit: "fill", kernel: "nearest" })
					.extractChannel(0)
					.raw()
					.toBuffer();

	for (let i = 3; i < data.length; i += 4) {
		data[i] = 0;
	}
	for (let y = 0; y < boxHeight; y += 1) {
		for (let x = 0; x < boxWidth; x += 1) {
			data[((y1 + y) * width + x1 + x) * 4 + 3] = alpha[y * boxWidth + x] ?? 0;
		}
	}

	const { left, side, top } = faceSquare({ x1, x2, y1, y2 }, width, height);
	const png = await sharp(data, { raw: { channels: 4, height, width } })
		.extract({ height: side, left, top, width: side })
		.resize(FACE_SIZE, FACE_SIZE)
		.png()
		.toBuffer();
	return new Uint8Array(png);
}
