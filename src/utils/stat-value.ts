const UNAMBIGUOUS_NUMBER = /^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/;

export function parseStatValue(value: string): string | number {
  const trimmed = value.trim();
  if (!UNAMBIGUOUS_NUMBER.test(trimmed)) {
    return value;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : value;
}
