import { describe, expect, test } from "bun:test";

import {
  assertCoverageAtLeast,
  parseLcovTotals,
} from "../scripts/check-coverage.ts";

describe("aggregate coverage gate", () => {
  test("sums line and function coverage across LCOV records", () => {
    const totals = parseLcovTotals(`TN:
SF:src/first.ts
FNF:2
FNH:2
LF:10
LH:9
end_of_record
TN:
SF:src/second.ts
FNF:3
FNH:2
LF:20
LH:18
end_of_record
`);

    expect(totals).toEqual({
      functionsFound: 5,
      functionsHit: 4,
      linesFound: 30,
      linesHit: 27,
    });
  });

  test("accepts the exact threshold and rejects either deficient metric", () => {
    expect(() =>
      assertCoverageAtLeast(
        {
          functionsFound: 10,
          functionsHit: 9,
          linesFound: 20,
          linesHit: 18,
        },
        0.9,
      ),
    ).not.toThrow();

    expect(() =>
      assertCoverageAtLeast(
        {
          functionsFound: 10,
          functionsHit: 8,
          linesFound: 20,
          linesHit: 18,
        },
        0.9,
      ),
    ).toThrow("function coverage");

    expect(() =>
      assertCoverageAtLeast(
        {
          functionsFound: 10,
          functionsHit: 9,
          linesFound: 20,
          linesHit: 17,
        },
        0.9,
      ),
    ).toThrow("line coverage");
  });

  test("rejects malformed or empty LCOV totals", () => {
    expect(() => parseLcovTotals("TN:\nend_of_record\n")).toThrow(
      "does not contain line and function totals",
    );
    expect(() => parseLcovTotals("LF:not-a-number\n")).toThrow(
      "Invalid LCOV total",
    );
  });
});
