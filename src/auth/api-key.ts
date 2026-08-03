import {
  AuthInputRequiredError,
  InvalidAuthKeyError,
  InvalidConfiguredApiKeyError,
  type CredentialSource,
} from "../errors";

export const API_KEY_MAX_LENGTH = 4096;

const bearerSafeApiKey = /^[A-Za-z0-9._~+/=-]+$/u;

export type ValidatedApiKey = string;

function removeOneLineTerminator(value: string): string {
  if (value.endsWith("\r\n")) return value.slice(0, -2);
  if (value.endsWith("\n") || value.endsWith("\r")) {
    return value.slice(0, -1);
  }
  return value;
}

function hasValidApiKeyFormat(value: string): boolean {
  return value.length <= API_KEY_MAX_LENGTH && bearerSafeApiKey.test(value);
}

export function isBlankApiKey(value: string | undefined): boolean {
  return value === undefined || value.trim().length === 0;
}

export function normalizeAuthApiKey(value: string): ValidatedApiKey {
  if (value.length > API_KEY_MAX_LENGTH + 2) {
    throw new InvalidAuthKeyError();
  }

  const normalized = removeOneLineTerminator(value).replace(
    /^[\t ]+|[\t ]+$/gu,
    "",
  );

  if (normalized.length === 0) {
    throw new AuthInputRequiredError();
  }

  if (!hasValidApiKeyFormat(normalized)) {
    throw new InvalidAuthKeyError();
  }

  return normalized;
}

export function normalizeConfiguredApiKey(
  value: string,
  source: CredentialSource,
): ValidatedApiKey {
  const normalized = value.trim();
  if (!hasValidApiKeyFormat(normalized)) {
    throw new InvalidConfiguredApiKeyError(source);
  }

  return normalized;
}
