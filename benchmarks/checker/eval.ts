/**
 * Offline replay of the checker benchmark. No network, no key.
 *
 *     bun run eval:checker
 *
 * Reads results.csv (one line per row and system: the model's P(yes)) and
 * latency.json, and prints the benchmark table plus two paired comparisons.
 * A model answers "yes" when P(yes) >= 0.5. A row is right when the answer
 * matches what the row's label asks for (see PASS_WHEN).
 */
import { readFileSync } from "node:fs";

const HERE = import.meta.dirname;
const PASS_AT = 0.5;
const Z95 = 1.959_963_984_540_054;
const SHOWN_DECIMALS = 1000;

/** [id, name] in display order. */
export const CHECKS = [
	["ageFitCalm", "Calm for the child's age"],
	["namesConsistent", "Names stay consistent"],
	["oneFactPerPlace", "One fact per place"],
	["outroRecaps", "Goodnight recaps the facts"],
	["scaryOrUnsafe", "Nothing scary or unsafe"],
	["factsTrue", "Facts are true"],
	["factsAnswerQuestion", "Facts answer the question"],
	["bedtimeFit", "Question suits a bedtime story"],
	["unsafeTopic", "Topic is safe for a young child"],
] as const;
/** The two risk checks pass on "no"; every other check passes on "yes". */
const RISK_CHECKS = new Set(["scaryOrUnsafe", "unsafeTopic"]);
const FACT_CHECKS = new Set(["factsTrue", "factsAnswerQuestion"]);

/** Table columns in order: [system id, header]. The two hybrids are computed here from the others. */
export const SYSTEMS = [
	["hybridV1", "Tuned Glimmer v1 + Spark Open"],
	["hybridV2", "Tuned Glimmer v2 + Spark Open"],
	["tunedV2", "Tuned Glimmer v2"],
	["tunedV1", "Tuned Glimmer v1"],
	["spark13", "Muse Spark 1.3"],
	["sparkOpen", "Muse Spark Open"],
	["glimmer", "Base Muse Glimmer"],
] as const;
const HYBRID_OF: Record<string, string> = {
	hybridV1: "tunedV1",
	hybridV2: "tunedV2",
};

export interface Row {
	check: string;
	label: "pass" | "fail";
	/** P(yes) per system. */
	p: Record<string, number>;
	state: string;
}

/** Was the system right on this row? */
export function isRight(row: Row, system: string): boolean {
	const yes = (row.p[system] as number) >= PASS_AT;
	const passAnswer = !RISK_CHECKS.has(row.check);
	return row.label === "pass" ? yes === passAnswer : yes !== passAnswer;
}

export interface Metrics {
	balancedAccuracy: number;
	caught: number;
	correct: number;
	failing: number;
	falseAlarms: number;
	passing: number;
	rows: number;
}

/** Balanced accuracy is the mean of the recall on passing rows and on failing rows (classes with rows only). */
export function metrics(rights: readonly boolean[], labels: readonly string[]) {
	let passing = 0;
	let passRight = 0;
	let failing = 0;
	let caught = 0;
	rights.forEach((ok, i) => {
		if (labels[i] === "pass") {
			passing += 1;
			passRight += ok ? 1 : 0;
		} else {
			failing += 1;
			caught += ok ? 1 : 0;
		}
	});
	const recalls = [
		...(passing ? [passRight / passing] : []),
		...(failing ? [caught / failing] : []),
	];
	return {
		balancedAccuracy: recalls.reduce((a, b) => a + b, 0) / recalls.length,
		caught,
		correct: passRight + caught,
		failing,
		falseAlarms: passing - passRight,
		passing,
		rows: rights.length,
	};
}

/** 95% Wilson score interval for k successes in n trials. */
export function wilson(k: number, n: number): [number, number] {
	const p = k / n;
	const z2 = Z95 * Z95;
	const centre = (p + z2 / (2 * n)) / (1 + z2 / n);
	const half =
		(Z95 * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / (1 + z2 / n);
	return [centre - half, centre + half];
}

/** Exact two-sided McNemar p-value: b rows only A got right, c rows only B got right. */
export function mcnemar(b: number, c: number): number {
	const n = b + c;
	if (n === 0) {
		return 1;
	}
	const logFact = [0];
	for (let i = 1; i <= n; i += 1) {
		logFact.push((logFact[i - 1] as number) + Math.log(i));
	}
	let tail = 0;
	for (let k = 0; k <= Math.min(b, c); k += 1) {
		tail += Math.exp(
			(logFact[n] as number) -
				(logFact[k] as number) -
				(logFact[n - k] as number) -
				n * Math.LN2
		);
	}
	return Math.min(1, 2 * tail);
}

export function median(values: readonly number[]): number {
	const s = [...values].sort((a, b) => a - b);
	const mid = Math.floor(s.length / 2);
	return s.length % 2
		? (s[mid] as number)
		: ((s[mid - 1] as number) + (s[mid] as number)) / 2;
}

export function loadRows(csv: string): Row[] {
	const rows = new Map<string, Row>();
	for (const line of csv.trim().split("\n").slice(1)) {
		const [state, check, label, system, p] = line.split(",") as [
			string,
			string,
			Row["label"],
			string,
			string,
		];
		const key = `${state}:${check}`;
		const row = rows.get(key) ?? { check, label, p: {}, state };
		row.p[system] = Number(p);
		rows.set(key, row);
	}
	// A hybrid answers like its tuned model, except the fact checks, which go to Muse Spark Open.
	for (const row of rows.values()) {
		for (const [hybrid, tuned] of Object.entries(HYBRID_OF)) {
			row.p[hybrid] = row.p[
				FACT_CHECKS.has(row.check) ? "sparkOpen" : tuned
			] as number;
		}
	}
	return [...rows.values()];
}

const pct = (x: number) => {
	const v = Math.round(x * SHOWN_DECIMALS) / 10;
	return v === 0 || v === 100 ? `${v}%` : `${v.toFixed(1)}%`;
};
const secs = (ms: number) => `${(ms / 1000).toFixed(2)} s`;
const round3 = (x: number) => Math.round(x * SHOWN_DECIMALS) / SHOWN_DECIMALS;

function table(rows: Row[], latency: Record<string, number[]>): string {
	const sys = (id: string, pick: (r: Row) => boolean = () => true) => {
		const sel = rows.filter(pick);
		return metrics(
			sel.map((r) => isRight(r, id)),
			sel.map((r) => r.label)
		);
	};
	const per = Object.fromEntries(
		SYSTEMS.map(([id]) => [
			id,
			CHECKS.map(([check]) => sys(id, (r) => r.check === check)),
		])
	);
	const all = Object.fromEntries(SYSTEMS.map(([id]) => [id, sys(id)]));
	const lines = [
		`| Check | ${SYSTEMS.map(([, n]) => n).join(" | ")} |`,
		`|---|${"---|".repeat(SYSTEMS.length)}`,
	];
	// Only the best value in each row is bold (ties included).
	const row = (
		label: string,
		vals: number[],
		fmt: (x: number) => string,
		best: (...v: number[]) => number = Math.max
	) => {
		const shown = vals.map(round3);
		const top = best(...shown);
		const cells = vals.map((v, i) =>
			shown[i] === top ? `**${fmt(v)}**` : fmt(v)
		);
		lines.push(`| ${label} | ${cells.join(" | ")} |`);
	};
	row(
		"All checks, mean balanced accuracy",
		SYSTEMS.map(([id]) => {
			const m = per[id] as Metrics[];
			return m.reduce((s, x) => s + x.balancedAccuracy, 0) / m.length;
		}),
		pct
	);
	for (const [i, [check, name]] of CHECKS.entries()) {
		row(
			`${name} (\`${check}\`)`,
			SYSTEMS.map(([id]) => (per[id] as Metrics[])[i]?.balancedAccuracy ?? 0),
			pct
		);
	}
	const first = all[SYSTEMS[0][0]] as Metrics;
	row(
		`Catches, ${first.failing} failing rows`,
		SYSTEMS.map(([id]) => (all[id] as Metrics).caught / first.failing),
		pct
	);
	row(
		`False alarms, ${first.passing.toLocaleString("en-US")} passing rows`,
		SYSTEMS.map(([id]) => (all[id] as Metrics).falseAlarms / first.passing),
		pct,
		Math.min
	);
	row(
		"Speed, full 7-question check, warm",
		SYSTEMS.map(([id]) => median(latency[id] as number[])),
		secs,
		Math.min
	);
	return lines.join("\n");
}

function compare(rows: Row[], a: string, b: string): string {
	const nameOf = (id: string) => SYSTEMS.find(([s]) => s === id)?.[1] ?? id;
	let onlyA = 0;
	let onlyB = 0;
	const line = (id: string) => {
		const k = rows.filter((r) => isRight(r, id)).length;
		const [lo, hi] = wilson(k, rows.length);
		return `${nameOf(id)}: ${k}/${rows.length} right = ${pct(k / rows.length)}, 95% Wilson interval ${pct(lo)} to ${pct(hi)}`;
	};
	for (const r of rows) {
		onlyA += isRight(r, a) && !isRight(r, b) ? 1 : 0;
		onlyB += !isRight(r, a) && isRight(r, b) ? 1 : 0;
	}
	const p = mcnemar(onlyA, onlyB);
	return [
		`- ${line(a)}`,
		`- ${line(b)}`,
		`- Exact McNemar test, same ${rows.length} rows: only ${nameOf(a)} right on ${onlyA}, only ${nameOf(b)} right on ${onlyB}, p = ${p < 0.0001 ? p.toExponential(2) : p.toFixed(4)}`,
	].join("\n");
}

if (import.meta.main) {
	const rows = loadRows(readFileSync(`${HERE}/results.csv`, "utf8"));
	const latency = JSON.parse(readFileSync(`${HERE}/latency.json`, "utf8")).ms;
	console.log(`${table(rows, latency)}\n`);
	console.log(
		"Speed comes from latency.json (20 timed full checks per system, median shown). Per-row timings were not recorded.\n"
	);
	console.log(
		`Paired comparisons on overall accuracy (all ${rows.length} rows, every check):\n`
	);
	console.log(
		`Tuned Glimmer v2 vs Muse Spark 1.3\n${compare(rows, "tunedV2", "spark13")}\n`
	);
	console.log(
		`Tuned Glimmer v1 + Spark Open vs Muse Spark 1.3\n${compare(rows, "hybridV1", "spark13")}`
	);
}
