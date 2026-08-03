import { lstat, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseEnv } from "node:util";

import {
  isBlankApiKey,
  normalizeConfiguredApiKey,
  type ValidatedApiKey,
} from "./auth/api-key";
import {
  EnvironmentFileReadError,
  InvalidEnvironmentFileError,
  MissingApiKeyError,
  UnsafeEnvironmentFileError,
  type CredentialSource,
} from "./errors";

export type Environment = Readonly<Record<string, string | undefined>>;

export interface ResolvedCredential {
  apiKey: ValidatedApiKey;
  source: CredentialSource;
  environmentFile?: string;
}

export interface ResolveCredentialOptions {
  environment?: Environment;
  environmentFile?: string;
  workingDirectory?: string;
}

function isMissingFile(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}

function stripByteOrderMark(value: string): string {
  return value.startsWith("\uFEFF") ? value.slice(1) : value;
}

export function getApiKey(environment: Environment = process.env): ValidatedApiKey {
  const value = environment.CFBD_API_KEY;
  if (isBlankApiKey(value)) {
    throw new MissingApiKeyError();
  }

  return normalizeConfiguredApiKey(value as string, "environment");
}

export async function resolveCredential(
  options: ResolveCredentialOptions = {},
): Promise<ResolvedCredential> {
  const environment = options.environment ?? process.env;
  const environmentValue = environment.CFBD_API_KEY;
  if (!isBlankApiKey(environmentValue)) {
    return {
      apiKey: normalizeConfiguredApiKey(
        environmentValue as string,
        "environment",
      ),
      source: "environment",
    };
  }

  const environmentFile = resolve(
    options.environmentFile ??
      resolve(options.workingDirectory ?? process.cwd(), ".env"),
  );

  let metadata;
  try {
    metadata = await lstat(environmentFile);
  } catch (error) {
    if (isMissingFile(error)) throw new MissingApiKeyError();
    throw new EnvironmentFileReadError(error);
  }

  if (metadata.isSymbolicLink() || !metadata.isFile()) {
    throw new UnsafeEnvironmentFileError();
  }

  let bytes: Uint8Array;
  try {
    bytes = await readFile(environmentFile);
  } catch (error) {
    throw new EnvironmentFileReadError(error);
  }

  let content: string;
  try {
    content = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (error) {
    throw new InvalidEnvironmentFileError(error);
  }

  let parsed: Record<string, string | undefined>;
  try {
    parsed = parseEnv(stripByteOrderMark(content));
  } catch (error) {
    throw new InvalidEnvironmentFileError(error);
  }

  const fileValue = parsed.CFBD_API_KEY;
  if (isBlankApiKey(fileValue)) {
    throw new MissingApiKeyError();
  }

  return {
    apiKey: normalizeConfiguredApiKey(fileValue as string, "env_file"),
    source: "env_file",
    environmentFile,
  };
}
