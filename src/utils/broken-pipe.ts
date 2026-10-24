type ExitProcess = (code: number) => void;

export function handleStdoutError(
  error: Error & { code?: string },
  exit: ExitProcess = (code) => process.exit(code),
): void {
  // macOS can report ENOTCONN when the stdout consumer closes early.
  if (error.code === "EPIPE" || error.code === "ENOTCONN") {
    exit(0);
    return;
  }

  throw error;
}
