export function orderObject(
  source: Record<string, unknown>,
  preferredKeys: readonly string[],
): Record<string, unknown> {
  const output: Record<string, unknown> = {};

  for (const key of preferredKeys) {
    if (Object.hasOwn(source, key)) {
      output[key] = source[key];
    }
  }

  for (const [key, value] of Object.entries(source)) {
    if (!Object.hasOwn(output, key)) {
      output[key] = value;
    }
  }

  return output;
}
