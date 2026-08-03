type ExitProcess = (code: number) => void;

export function handleStdoutError(
  error: Error & { code?: string },
  exit: ExitProcess = (code) => process.exit(code),
): void {
  if (error.code === "EPIPE") {
    exit(0);
    return;
  }

  throw error;
}
