export function snakeCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
    .replace(/[\s./-]+/g, "_")
    .replace(/[^A-Za-z0-9_]+/g, "")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .toLowerCase();
}

export function snakeCaseDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(snakeCaseDeep);
  }

  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [snakeCase(key), snakeCaseDeep(entry)]),
    );
  }

  return value;
}
