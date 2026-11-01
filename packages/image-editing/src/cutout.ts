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
 * Makes every clear pixel that the box edge cannot reach solid: SAM can leave
 * holes inside one object (a cat on a roof), and a cut-out must not.
 */
export function fillHoles(alpha: Uint8Array, width: number, height: number) {
	const outside = new Uint8Array(width * height);
	const stack: number[] = [];
	const visit = (x: number, y: number) => {
		const i = y * width + x;
		if (alpha[i] === 0 && outside[i] === 0) {
			outside[i] = 1;
			stack.push(i);
		}
	};
	for (let x = 0; x < width; x += 1) {
		visit(x, 0);
		visit(x, height - 1);
	}
	for (let y = 0; y < height; y += 1) {
		visit(0, y);
		visit(width - 1, y);
	}
	while (stack.length > 0) {
		const i = stack.pop() as number;
		const x = i % width;
		const y = (i - x) / width;
		if (x > 0) {
			visit(x - 1, y);
		}
		if (x < width - 1) {
			visit(x + 1, y);
		}
		if (y > 0) {
			visit(x, y - 1);
		}
		if (y < height - 1) {
			visit(x, y + 1);
		}
	}
	const filled = new Uint8Array(alpha);
	for (let i = 0; i < filled.length; i += 1) {
		if (outside[i] === 0) {
			filled[i] = 255;
		}
	}
	return filled;
}

/** The image with everything outside the mask made transparent, plus the clamped box. */
async function maskOut(
	image: Uint8Array,
	found: Found,
	options: { fill?: boolean } = {}
) {
	const { box, mask, maskHeight, maskWidth } = found;
	if (mask.length !== maskWidth * maskHeight) {
		throw new Error(
			`mask length ${mask.length} does not match ${maskWidth}x${maskHeight}`
		);
	}
	// rotate(): phone photos carry an EXIF orientation.
	const { data, info } = await sharp(image)
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
	const stretched =
		boxWidth === maskWidth && boxHeight === maskHeight
			? alphaSource
			: await sharp(alphaSource, {
					raw: { channels: 1, height: maskHeight, width: maskWidth },
				})
					.resize(boxWidth, boxHeight, { fit: "fill", kernel: "nearest" })
					.extractChannel(0)
					.raw()
					.toBuffer();
	const alpha = options.fill
		? fillHoles(new Uint8Array(stretched), boxWidth, boxHeight)
		: stretched;

	for (let i = 3; i < data.length; i += 4) {
		data[i] = 0;
	}
	for (let y = 0; y < boxHeight; y += 1) {
		for (let x = 0; x < boxWidth; x += 1) {
			data[((y1 + y) * width + x1 + x) * 4 + 3] = alpha[y * boxWidth + x] ?? 0;
		}
	}
	return { box: { x1, x2, y1, y2 }, data, height, width };
}

/**
 * The masked person on a transparent background, cropped square and resized to
 * 512 px. SAM's mask covers only its box, so it is stretched back over the box.
 */
export async function faceCutout(
	photo: Uint8Array,
	found: Found
): Promise<Uint8Array> {
	const { box, data, height, width } = await maskOut(photo, found);
	const { left, side, top } = faceSquare(box, width, height);
	const png = await sharp(data, { raw: { channels: 4, height, width } })
		.extract({ height: side, left, top, width: side })
		.resize(FACE_SIZE, FACE_SIZE)
		.png()
		.toBuffer();
	return new Uint8Array(png);
}

/** Margin kept around a cut-out object, as a share of its longer side. */
const OBJECT_MARGIN = 0.04;

/**
 * The masked object on a transparent background, holes inside it filled,
 * cropped to its box with a small margin, at its own size: a picture with no
 * background.
 */
export async function objectCutout(
	image: Uint8Array,
	found: Found
): Promise<Uint8Array> {
	const { box, data, height, width } = await maskOut(image, found, {
		fill: true,
	});
	const pad = Math.round(
		Math.max(box.x2 - box.x1, box.y2 - box.y1) * OBJECT_MARGIN
	);
	const left = Math.max(0, box.x1 - pad);
	const top = Math.max(0, box.y1 - pad);
	const png = await sharp(data, { raw: { channels: 4, height, width } })
		.extract({
			height: Math.min(height, box.y2 + pad) - top,
			left,
			top,
			width: Math.min(width, box.x2 + pad) - left,
		})
		.png()
		.toBuffer();
	return new Uint8Array(png);
}
