import { MissingApiKeyError } from "./errors";

export type Environment = Readonly<Record<string, string | undefined>>;

export function getApiKey(environment: Environment = process.env): string {
  const apiKey = environment.CFBD_API_KEY?.trim();
  if (apiKey === undefined || apiKey.length === 0) {
    throw new MissingApiKeyError();
  }

  return apiKey;
}
