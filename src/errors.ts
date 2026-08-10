import type { ZodError } from "zod";

export interface CliErrorOptions {
  code: string;
  message: string;
  status?: number;
  command?: string;
  query?: Record<string, unknown>;
  hint?: string;
  exitCode?: number;
  metadata?: Record<string, unknown>;
  cause?: unknown;
}

export class CliError extends Error {
  readonly code: string;
  readonly status: number | undefined;
  readonly command: string | undefined;
  readonly query: Record<string, unknown> | undefined;
  readonly hint: string | undefined;
  readonly exitCode: number;
  readonly metadata: Record<string, unknown> | undefined;

  constructor(options: CliErrorOptions) {
    super(options.message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = "CliError";
    this.code = options.code;
    this.status = options.status;
    this.command = options.command;
    this.query = options.query;
    this.hint = options.hint;
    this.exitCode = options.exitCode ?? 1;
    this.metadata = options.metadata;
  }

  withContext(command: string, query?: Record<string, unknown>): CliError {
    if (this.code === "missing_api_key") {
      return this;
    }

    const contextualQuery = this.query ?? query;
    return new CliError({
      code: this.code,
      message: this.message,
      ...(this.status === undefined ? {} : { status: this.status }),
      command: this.command ?? command,
      ...(contextualQuery === undefined ? {} : { query: contextualQuery }),
      ...(this.hint === undefined ? {} : { hint: this.hint }),
      exitCode: this.exitCode,
      ...(this.metadata === undefined ? {} : { metadata: this.metadata }),
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

export type CredentialSource = "environment" | "env_file";

export class InvalidConfiguredApiKeyError extends CliError {
  constructor(source: CredentialSource) {
    super({
      code: "invalid_api_key",
      message: "CFBD_API_KEY has an invalid format.",
      hint:
        source === "environment"
          ? "Replace or unset CFBD_API_KEY in the environment."
          : "Run fbs auth to replace CFBD_API_KEY in .env.",
      exitCode: 2,
    });
  }
}

export class EnvironmentFileReadError extends CliError {
  constructor(cause?: unknown) {
    super({
      code: "env_file_read_failed",
      message: "The .env file could not be read.",
      hint: "Check permissions for .env in the current directory and try again.",
      exitCode: 1,
      cause,
    });
  }
}

export class InvalidEnvironmentFileError extends CliError {
  constructor(cause?: unknown) {
    super({
      code: "env_file_invalid",
      message: "The .env file could not be parsed.",
      hint: "Fix the .env syntax in the current directory and try again.",
      exitCode: 2,
      cause,
    });
  }
}

export class UnsafeEnvironmentFileError extends CliError {
  constructor() {
    super({
      code: "unsafe_env_file",
      message: ".env must be a regular file and must not be a symbolic link.",
      hint: "Replace .env with a regular file in the current directory.",
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

export class InvalidOutputLimitError extends CliError {
  constructor() {
    super({
      code: "invalid_output_limit",
      message: "FBS_MAX_OUTPUT_CHARS must be a non-negative safe integer.",
      hint: "Set FBS_MAX_OUTPUT_CHARS to 0 to disable the limit or to a positive safe integer.",
      exitCode: 2,
    });
  }
}

export class OutputTooLargeError extends CliError {
  constructor(options: {
    command: string;
    query: Record<string, unknown>;
    filters?: Record<string, unknown>;
    outputCharacters: number;
    maxOutputCharacters: number;
  }) {
    super({
      code: "output_too_large",
      message: "The rendered YAML exceeds FBS_MAX_OUTPUT_CHARS.",
      command: options.command,
      query: options.query,
      hint: "Narrow the query or local filters, or raise FBS_MAX_OUTPUT_CHARS.",
      exitCode: 2,
      metadata: {
        ...(options.filters === undefined ? {} : { filters: options.filters }),
        outputCharacters: options.outputCharacters,
        maxOutputCharacters: options.maxOutputCharacters,
      },
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

export function redactSensitive(
  value: string,
  sensitiveValues: readonly string[] = [],
): string {
  let redacted = value;
  for (const sensitiveValue of sensitiveValues) {
    if (sensitiveValue.length === 0) continue;
    redacted = redacted.split(sensitiveValue).join("[REDACTED]");
  }

  return redacted
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [REDACTED]")
    .replace(/CFBD_API_KEY\s*=\s*\S+/gi, "CFBD_API_KEY=[REDACTED]")
    .replace(/Authorization\s*:\s*[^,}\r\n]+/gi, "Authorization: [REDACTED]");
}

function redactCliError(
  error: CliError,
  sensitiveValues: readonly string[],
): CliError {
  if (sensitiveValues.length === 0) return error;

  const message = redactSensitive(error.message, sensitiveValues);
  const hint =
    error.hint === undefined
      ? undefined
      : redactSensitive(error.hint, sensitiveValues);
  if (message === error.message && hint === error.hint) return error;

  return new CliError({
    code: error.code,
    message,
    ...(error.status === undefined ? {} : { status: error.status }),
    ...(error.command === undefined ? {} : { command: error.command }),
    ...(error.query === undefined ? {} : { query: error.query }),
    ...(hint === undefined ? {} : { hint }),
    exitCode: error.exitCode,
    ...(error.metadata === undefined ? {} : { metadata: error.metadata }),
    cause: error.cause,
  });
}

export function asCliError(
  error: unknown,
  sensitiveValues: readonly string[] = [],
): CliError {
  if (error instanceof CliError) {
    return redactCliError(error, sensitiveValues);
  }

  const message = error instanceof Error ? error.message : "An unexpected error occurred.";
  return new CliError({
    code: "unexpected_error",
    message: redactSensitive(message, sensitiveValues),
    exitCode: 1,
    cause: error,
  });
}
