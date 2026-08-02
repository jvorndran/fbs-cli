import { randomUUID } from "node:crypto";
import {
  chmod,
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, posix, win32 } from "node:path";

import type { Environment } from "../config";
import {
  AuthInputRequiredError,
  CredentialReadError,
  CredentialWriteError,
  InvalidAuthKeyError,
} from "../errors";

export const AUTH_KEY_MAX_LENGTH = 4096;

const credentialPrefix = "CFBD_API_KEY=";
const bearerSafeApiKey = /^[A-Za-z0-9._~+/=-]+$/u;

export interface CredentialPathOptions {
  platform?: NodeJS.Platform;
  environment?: Environment;
  homeDirectory?: string;
}

export interface SaveCredentialOptions {
  credentialsFile?: string;
  platform?: NodeJS.Platform;
}

export interface LoadStoredCredentialOptions {
  credentialsFile?: string;
  environment?: NodeJS.ProcessEnv;
}

export interface SavedCredential {
  credentialsFile: string;
}

function nonblank(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized === undefined || normalized.length === 0
    ? undefined
    : normalized;
}

export function getCredentialsFilePath(
  options: CredentialPathOptions = {},
): string {
  const platform = options.platform ?? process.platform;
  const environment = options.environment ?? process.env;
  const homeDirectory = options.homeDirectory ?? homedir();

  if (platform === "win32") {
    const localAppData = nonblank(environment.LOCALAPPDATA);
    const configRoot =
      localAppData !== undefined && win32.isAbsolute(localAppData)
        ? localAppData
        : win32.join(homeDirectory, "AppData", "Local");
    return win32.join(configRoot, "fbs-cli", "credentials.env");
  }

  if (platform === "darwin") {
    return posix.join(
      homeDirectory,
      "Library",
      "Application Support",
      "fbs-cli",
      "credentials.env",
    );
  }

  const xdgConfigHome = nonblank(environment.XDG_CONFIG_HOME);
  const configRoot =
    xdgConfigHome !== undefined && posix.isAbsolute(xdgConfigHome)
      ? xdgConfigHome
      : posix.join(homeDirectory, ".config");
  return posix.join(configRoot, "fbs-cli", "credentials.env");
}

function removeOneLineTerminator(value: string): string {
  if (value.endsWith("\r\n")) return value.slice(0, -2);
  if (value.endsWith("\n") || value.endsWith("\r")) {
    return value.slice(0, -1);
  }
  return value;
}

export function normalizeAuthApiKey(value: string): string {
  if (value.length > AUTH_KEY_MAX_LENGTH + 2) {
    throw new InvalidAuthKeyError();
  }

  const normalized = removeOneLineTerminator(value).replace(
    /^[\t ]+|[\t ]+$/gu,
    "",
  );

  if (normalized.length === 0) {
    throw new AuthInputRequiredError();
  }

  if (
    normalized.length > AUTH_KEY_MAX_LENGTH ||
    !bearerSafeApiKey.test(normalized)
  ) {
    throw new InvalidAuthKeyError();
  }

  return normalized;
}

function isNodeErrorCode(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}

function parseCredentialFile(value: string): string {
  const content = removeOneLineTerminator(value);
  if (!content.startsWith(credentialPrefix)) {
    throw new CredentialReadError();
  }

  try {
    return normalizeAuthApiKey(content.slice(credentialPrefix.length));
  } catch (error) {
    throw new CredentialReadError(error);
  }
}

export async function saveCredential(
  apiKeyInput: string,
  options: SaveCredentialOptions = {},
): Promise<SavedCredential> {
  const apiKey = normalizeAuthApiKey(apiKeyInput);
  const platform = options.platform ?? process.platform;
  const credentialsFile = options.credentialsFile ?? getCredentialsFilePath();
  const credentialsDirectory = dirname(credentialsFile);
  const temporaryFile = `${credentialsFile}.${process.pid}.${randomUUID()}.tmp`;

  try {
    await mkdir(credentialsDirectory, { recursive: true, mode: 0o700 });
    if (platform !== "win32") {
      await chmod(credentialsDirectory, 0o700);
    }

    await writeFile(temporaryFile, `${credentialPrefix}${apiKey}\n`, {
      encoding: "utf8",
      flag: "wx",
      flush: true,
      mode: 0o600,
    });
    if (platform !== "win32") {
      await chmod(temporaryFile, 0o600);
    }

    await rename(temporaryFile, credentialsFile);
    return { credentialsFile };
  } catch (error) {
    try {
      await rm(temporaryFile, { force: true });
    } catch {
      // Preserve the original write failure.
    }
    throw new CredentialWriteError(error);
  }
}

export async function loadStoredCredential(
  options: LoadStoredCredentialOptions = {},
): Promise<boolean> {
  const environment = options.environment ?? process.env;
  if (environment.CFBD_API_KEY !== undefined) {
    return false;
  }

  const credentialsFile = options.credentialsFile ?? getCredentialsFilePath();
  let content: string;
  try {
    content = await readFile(credentialsFile, "utf8");
  } catch (error) {
    if (isNodeErrorCode(error, "ENOENT")) return false;
    throw new CredentialReadError(error);
  }

  environment.CFBD_API_KEY = parseCredentialFile(content);
  return true;
}
