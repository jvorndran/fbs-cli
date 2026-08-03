import { randomUUID } from "node:crypto";
import {
  lstat,
  open,
  readFile,
  rename,
  unlink,
  type FileHandle,
} from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";

import {
  API_KEY_MAX_LENGTH,
  normalizeAuthApiKey,
} from "./api-key";
import {
  EnvironmentFileUpdateError,
  UnsafeEnvironmentFileError,
} from "../errors";

export { API_KEY_MAX_LENGTH, normalizeAuthApiKey } from "./api-key";

const apiKeyAssignment = /^[\t ]*(?:export[\t ]+)?CFBD_API_KEY[\t ]*=/u;

export interface SaveCredentialOptions {
  environmentFile?: string;
  renameFile?: (source: string, destination: string) => Promise<void>;
}

export interface SavedCredential {
  environmentFile: string;
}

export function getEnvironmentFilePath(
  workingDirectory: string = process.cwd(),
): string {
  return resolve(workingDirectory, ".env");
}

export function updateEnvironmentFile(content: string, apiKey: string): string {
  const hasByteOrderMark = content.startsWith("\uFEFF");
  const contentWithoutMark = hasByteOrderMark ? content.slice(1) : content;
  const lineEnding = contentWithoutMark.match(/\r\n|\n|\r/u)?.[0] ?? "\n";
  const normalizedContent = contentWithoutMark.replace(/\r\n|\r/gu, "\n");
  const hadFinalLineEnding = /\n$/u.test(normalizedContent);
  const lines =
    contentWithoutMark.length === 0 ? [] : normalizedContent.split("\n");
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
  const updated = `${updatedLines.join(lineEnding)}${lineEnding}`;
  return hasByteOrderMark ? `\uFEFF${updated}` : updated;
}

function isMissingFile(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}

async function readEnvironmentFile(environmentFile: string): Promise<string> {
  let metadata;
  try {
    metadata = await lstat(environmentFile);
  } catch (error) {
    if (isMissingFile(error)) return "";
    throw new EnvironmentFileUpdateError(error);
  }

  if (metadata.isSymbolicLink() || !metadata.isFile()) {
    throw new UnsafeEnvironmentFileError();
  }

  try {
    return await readFile(environmentFile, "utf8");
  } catch (error) {
    throw new EnvironmentFileUpdateError(error);
  }
}

async function closeQuietly(handle: FileHandle | undefined): Promise<void> {
  if (handle === undefined) return;
  try {
    await handle.close();
  } catch {
    // Preserve the primary write failure.
  }
}

async function unlinkQuietly(path: string): Promise<void> {
  try {
    await unlink(path);
  } catch (error) {
    if (!isMissingFile(error)) {
      // Preserve the primary write failure.
    }
  }
}

async function writeEnvironmentFileAtomically(
  environmentFile: string,
  content: string,
  renameFile: (source: string, destination: string) => Promise<void> = rename,
): Promise<void> {
  const temporaryFile = resolve(
    dirname(environmentFile),
    `.${basename(environmentFile)}.${process.pid}.${randomUUID()}.tmp`,
  );
  let handle: FileHandle | undefined;
  let renamed = false;

  try {
    handle = await open(temporaryFile, "wx", 0o600);
    await handle.writeFile(content, "utf8");
    await handle.sync();
    await handle.close();
    handle = undefined;
    await renameFile(temporaryFile, environmentFile);
    renamed = true;
  } catch (error) {
    throw new EnvironmentFileUpdateError(error);
  } finally {
    await closeQuietly(handle);
    if (!renamed) await unlinkQuietly(temporaryFile);
  }
}

export async function saveCredential(
  apiKeyInput: string,
  options: SaveCredentialOptions = {},
): Promise<SavedCredential> {
  const apiKey = normalizeAuthApiKey(apiKeyInput);
  const environmentFile = resolve(
    options.environmentFile ?? getEnvironmentFilePath(),
  );
  const content = await readEnvironmentFile(environmentFile);
  await writeEnvironmentFileAtomically(
    environmentFile,
    updateEnvironmentFile(content, apiKey),
    options.renameFile,
  );

  return { environmentFile };
}
