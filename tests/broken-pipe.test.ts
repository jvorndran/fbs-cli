import { describe, expect, test } from "bun:test";

import { handleStdoutError } from "../src/utils/broken-pipe";

describe("stdout broken-pipe handling", () => {
  test.each(["EPIPE", "ENOTCONN"])("exits successfully for %s", (code) => {
    const exitCodes: number[] = [];
    const error = Object.assign(new Error("stdout consumer closed"), { code });

    handleStdoutError(error, (code) => exitCodes.push(code));

    expect(exitCodes).toEqual([0]);
  });

  test.each(["EIO", "EBADF", "ECONNRESET", undefined])(
    "rethrows stdout errors with code %s without exiting",
    (code) => {
      const exitCodes: number[] = [];
      const error = code === undefined
        ? new Error("write failed")
        : Object.assign(new Error("write failed"), { code });
      let thrown: unknown;

      try {
        handleStdoutError(error, (exitCode) => exitCodes.push(exitCode));
      } catch (caught) {
        thrown = caught;
      }

      expect(thrown).toBe(error);
      expect(exitCodes).toEqual([]);
    },
  );
});
