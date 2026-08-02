import type { ZodError } from "zod";

export interface CliErrorOptions {
  code: string;
  message: string;
  status?: number;
  command?: string;
  query?: Record<string, unknown>;
  hint?: string;
  exitCode?: number;
  cause?: unknown;
}

export class CliError extends Error {
  readonly code: string;
  readonly status: number | undefined;
  readonly command: string | undefined;
  readonly query: Record<string, unknown> | undefined;
  readonly hint: string | undefined;
  readonly exitCode: number;

  constructor(options: CliErrorOptions) {
    super(options.message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = "CliError";
    this.code = options.code;
    this.status = options.status;
    this.command = options.command;
    this.query = options.query;
    this.hint = options.hint;
    this.exitCode = options.exitCode ?? 1;
  }

  withContext(command: string, query: Record<string, unknown>): CliError {
    if (this.code === "missing_api_key") {
      return this;
    }

    return new CliError({
      code: this.code,
      message: this.message,
      ...(this.status === undefined ? {} : { status: this.status }),
      command: this.command ?? command,
      query: this.query ?? query,
      ...(this.hint === undefined ? {} : { hint: this.hint }),
      exitCode: this.exitCode,
      cause: this.cause,
    });
  }
}

export class MissingApiKeyError extends CliError {
  constructor() {
    super({
      code: "missing_api_key",
      message: "CFBD_API_KEY is required.",
      hint: "Set CFBD_API_KEY or run fbs auth to create .env in the current directory.",
      exitCode: 2,
    });
  }
}

export class AuthInputRequiredError extends CliError {
  constructor() {
    super({
      code: "auth_input_required",
      message: "No CFBD API key was provided.",
      command: "auth",
      hint: "Paste a CFBD API key when prompted or pipe one key to stdin.",
      exitCode: 2,
    });
  }
}

export class InvalidAuthKeyError extends CliError {
  constructor() {
    super({
      code: "auth_invalid_key",
      message: "The CFBD API key has an invalid format.",
      command: "auth",
      hint: "Provide one nonblank API key without spaces or line breaks.",
      exitCode: 2,
    });
  }
}

export class AuthCancelledError extends CliError {
  constructor() {
    super({
      code: "auth_cancelled",
      message: "Authentication was cancelled.",
      command: "auth",
      hint: "Run fbs auth again when you are ready.",
      exitCode: 2,
    });
  }
}

export class EnvironmentFileUpdateError extends CliError {
  constructor(cause?: unknown) {
    super({
      code: "env_file_update_failed",
      message: "The .env file could not be updated.",
      command: "auth",
      hint: "Check permissions for .env in the current directory and try again.",
      exitCode: 1,
      cause,
    });
  }
}

export class QueryValidationError extends CliError {
  constructor(message: string, hint?: string) {
    super({
      code: "invalid_query",
      message,
      ...(hint === undefined ? {} : { hint }),
      exitCode: 2,
    });
  }
}

export class CfbdRequestError extends CliError {
  constructor(options: Omit<CliErrorOptions, "exitCode">) {
    super({ ...options, exitCode: 1 });
  }
}

export function fromZodError(error: ZodError): QueryValidationError {
  const issue = error.issues[0];
  if (issue === undefined) {
    return new QueryValidationError("The query is invalid.");
  }

  const field = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
  return new QueryValidationError(`${field}${issue.message}`);
}

export function redactSensitive(value: string): string {
  return value
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [REDACTED]")
    .replace(/CFBD_API_KEY\s*=\s*\S+/gi, "CFBD_API_KEY=[REDACTED]")
    .replace(/Authorization\s*:\s*[^,}\r\n]+/gi, "Authorization: [REDACTED]");
}

export function asCliError(error: unknown): CliError {
  if (error instanceof CliError) {
    return error;
  }

  const message = error instanceof Error ? error.message : "An unexpected error occurred.";
  return new CliError({
    code: "unexpected_error",
    message: redactSensitive(message),
    exitCode: 1,
    cause: error,
  });
}
