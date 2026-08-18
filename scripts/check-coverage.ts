import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export interface CoverageTotals {
  functionsFound: number;
  functionsHit: number;
  linesFound: number;
  linesHit: number;
}

const LCOV_TOTAL_KEYS = {
  FNF: "functionsFound",
  FNH: "functionsHit",
  LF: "linesFound",
  LH: "linesHit",
} as const satisfies Record<string, keyof CoverageTotals>;

export function parseLcovTotals(source: string): CoverageTotals {
  const totals: CoverageTotals = {
    functionsFound: 0,
    functionsHit: 0,
    linesFound: 0,
    linesHit: 0,
  };

  for (const line of source.split(/\r?\n/u)) {
    const separator = line.indexOf(":");
    if (separator === -1) {
      continue;
    }

    const key = line.slice(0, separator) as keyof typeof LCOV_TOTAL_KEYS;
    const target = LCOV_TOTAL_KEYS[key];
    if (target === undefined) {
      continue;
    }

    const value = Number(line.slice(separator + 1));
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new Error(`Invalid LCOV total: ${line}`);
    }
    totals[target] += value;
  }

  if (totals.functionsFound === 0 || totals.linesFound === 0) {
    throw new Error("LCOV report does not contain line and function totals.");
  }

  return totals;
}

function percentage(hit: number, found: number): number {
  return (hit / found) * 100;
}

export function assertCoverageAtLeast(
  totals: CoverageTotals,
  threshold: number,
): void {
  const functionRatio = totals.functionsHit / totals.functionsFound;
  const lineRatio = totals.linesHit / totals.linesFound;

  if (functionRatio < threshold) {
    throw new Error(
      `Aggregate function coverage ${percentage(totals.functionsHit, totals.functionsFound).toFixed(2)}% is below ${(threshold * 100).toFixed(2)}%.`,
    );
  }
  if (lineRatio < threshold) {
    throw new Error(
      `Aggregate line coverage ${percentage(totals.linesHit, totals.linesFound).toFixed(2)}% is below ${(threshold * 100).toFixed(2)}%.`,
    );
  }
}

async function main(): Promise<void> {
  const reportPath = resolve("coverage", "lcov.info");
  const totals = parseLcovTotals(await readFile(reportPath, "utf8"));
  const threshold = 0.9;
  assertCoverageAtLeast(totals, threshold);
  process.stdout.write(
    `Aggregate coverage passed: ${percentage(totals.functionsHit, totals.functionsFound).toFixed(2)}% functions, ${percentage(totals.linesHit, totals.linesFound).toFixed(2)}% lines.\n`,
  );
}

if (import.meta.main) {
  await main();
}
