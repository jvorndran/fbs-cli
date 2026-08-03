import { describe, expect, test } from "bun:test";

import { handleStdoutError } from "../src/utils/broken-pipe";

describe("stdout broken-pipe handling", () => {
  test("exits successfully for EPIPE", () => {
    const exitCodes: number[] = [];
    const error = Object.assign(new Error("broken pipe"), { code: "EPIPE" });

    handleStdoutError(error, (code) => exitCodes.push(code));

    expect(exitCodes).toEqual([0]);
  });

  test("rethrows other stdout errors", () => {
    const error = Object.assign(new Error("write failed"), { code: "EIO" });

    expect(() => handleStdoutError(error, () => undefined)).toThrow(error);
  });
});
