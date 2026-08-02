import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  AuthInputRequiredError,
  EnvironmentFileUpdateError,
  InvalidAuthKeyError,
} from "../errors";

export const AUTH_KEY_MAX_LENGTH = 4096;

const bearerSafeApiKey = /^[A-Za-z0-9._~+/=-]+$/u;
const apiKeyAssignment = /^[\t ]*(?:export[\t ]+)?CFBD_API_KEY[\t ]*=/u;

export interface SaveCredentialOptions {
  environmentFile?: string;
}

export interface SavedCredential {
  environmentFile: string;
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

export function getEnvironmentFilePath(
  workingDirectory: string = process.cwd(),
): string {
  return resolve(workingDirectory, ".env");
}

export function updateEnvironmentFile(content: string, apiKey: string): string {
  const lineEnding = content.includes("\r\n") ? "\r\n" : "\n";
  const normalizedContent = content.replace(/\r\n|\r/gu, "\n");
  const hadFinalLineEnding = /\n$/u.test(normalizedContent);
  const lines = content.length === 0 ? [] : normalizedContent.split("\n");
  if (hadFinalLineEnding) lines.pop();

  const assignment = `CFBD_API_KEY=${apiKey}`;
  const updatedLines: string[] = [];
  let replaced = false;

  for (const line of lines) {
    if (apiKeyAssignment.test(line)) {
      if (!replaced) updatedLines.push(assignment);
      replaced = true;
      continue;
    }
    updatedLines.push(line);
  }

  if (!replaced) updatedLines.push(assignment);
  return `${updatedLines.join(lineEnding)}${lineEnding}`;
}

function isMissingFile(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}

export async function saveCredential(
  apiKeyInput: string,
  options: SaveCredentialOptions = {},
): Promise<SavedCredential> {
  const apiKey = normalizeAuthApiKey(apiKeyInput);
  const environmentFile =
    options.environmentFile ?? getEnvironmentFilePath();

  let content = "";
  try {
    content = await readFile(environmentFile, "utf8");
  } catch (error) {
    if (!isMissingFile(error)) throw new EnvironmentFileUpdateError(error);
  }

  try {
    await writeFile(environmentFile, updateEnvironmentFile(content, apiKey), {
      encoding: "utf8",
      mode: 0o600,
    });
  } catch (error) {
    throw new EnvironmentFileUpdateError(error);
  }

  return { environmentFile };
}
