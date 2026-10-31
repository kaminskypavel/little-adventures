const EVENT_BREAK = /\r?\n\r?\n/u;
const LINE_BREAK = /\r?\n/u;
const DATA_PREFIX = /^data: ?/u;

/** The JSON payload of one SSE event block (its `data:` lines joined), or null when it has none. */
export function eventData(block: string): unknown {
	const data = block
		.split(LINE_BREAK)
		.filter((line) => line.startsWith("data:"))
		.map((line) => line.replace(DATA_PREFIX, ""))
		.join("\n")
		.trim();
	if (!data || data === "[DONE]") {
		return null;
	}
	return JSON.parse(data);
}

/**
 * Splits streamed text into complete event blocks. Returns the blocks and the
 * unfinished tail to prepend to the next chunk.
 */
export function splitEvents(buffer: string): {
	blocks: string[];
	rest: string;
} {
	const parts = buffer.split(EVENT_BREAK);
	const rest = parts.pop() ?? "";
	return { blocks: parts, rest };
}

/** Reads a fetch body as parsed SSE events. */
export async function* sseEvents(
	body: ReadableStream<Uint8Array>
): AsyncGenerator<{ type: string }> {
	const decoder = new TextDecoder();
	let buffer = "";
	for await (const chunk of body) {
		buffer += decoder.decode(chunk, { stream: true });
		const { blocks, rest } = splitEvents(buffer);
		buffer = rest;
		for (const block of blocks) {
			const event = eventData(block);
			if (event) {
				yield event as { type: string };
			}
		}
	}
	const tail = eventData(buffer + decoder.decode());
	if (tail) {
		yield tail as { type: string };
	}
}
