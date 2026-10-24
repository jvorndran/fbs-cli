import { describe, expect, test } from "bun:test";

import { handleStdoutError } from "../src/utils/broken-pipe";

describe("stdout broken-pipe handling", () => {
  test.each(["EPIPE", "ENOTCONN"])("exits successfully for %s", (code) => {
    const exitCodes: number[] = [];
    const error = Object.assign(new Error("closed stdout"), { code });

    handleStdoutError(error, (code) => exitCodes.push(code));

    expect(exitCodes).toEqual([0]);
  });

  test.each(["EIO", "ENOSPC", "EBADF", "ECONNRESET", undefined])(
    "rethrows unrelated stdout errors with code %s",
    (code) => {
      const exitCodes: number[] = [];
      const error = code === undefined
        ? new Error("write failed")
        : Object.assign(new Error("write failed"), { code });

      expect(() => handleStdoutError(error, (exitCode) => exitCodes.push(exitCode))).toThrow(error);
      expect(exitCodes).toEqual([]);
    },
  );
});
