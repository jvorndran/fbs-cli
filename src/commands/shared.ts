import { asCliError } from "../errors";

export function asQueryRecord(value: object): Record<string, unknown> {
  return value as unknown as Record<string, unknown>;
}

export async function withCommandContext<T>(
  command: string,
  query: object,
  operation: () => Promise<T>,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw asCliError(error).withContext(command, asQueryRecord(query));
  }
}
