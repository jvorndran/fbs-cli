import { InvalidArgumentError } from "commander";

import { QueryValidationError } from "../errors";

export type LocalFilterValue = string | number | boolean;
export type LocalFilters = Record<string, LocalFilterValue>;
type Filterable = Record<string, unknown>;

export function parseBoolean(value: string): boolean {
  if (value === "true") return true;
  if (value === "false") return false;
  throw new InvalidArgumentError("Expected true or false.");
}

export function parseNumber(value: string): number {
  if (value.trim() === "") throw new InvalidArgumentError("Expected a number.");
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new InvalidArgumentError("Expected a finite number.");
  return parsed;
}

export function parseNonNegativeInteger(value: string): number {
  if (!/^\d+$/u.test(value)) {
    throw new InvalidArgumentError("Expected a non-negative safe integer.");
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new InvalidArgumentError("Expected a non-negative safe integer.");
  }
  return parsed;
}

export function parseDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) {
    throw new InvalidArgumentError("Expected a YYYY-MM-DD date.");
  }
  const parts = value.split("-").map(Number);
  const year = parts[0]!;
  const month = parts[1]!;
  const day = parts[2]!;
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new InvalidArgumentError("Expected a valid YYYY-MM-DD date.");
  }
  return value;
}

/** Normalize client-only filters and reject blank text before a provider call. */
export function localFilters(
  values: Readonly<Record<string, LocalFilterValue | undefined>>,
): LocalFilters | undefined {
  const result: LocalFilters = {};
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) continue;
    if (typeof value === "string") {
      const normalized = value.trim();
      if (normalized === "") {
        throw new QueryValidationError(`${key} must not be blank.`);
      }
      result[key] = normalized;
    } else {
      result[key] = value;
    }
  }
  return Object.keys(result).length === 0 ? undefined : result;
}

export function validateOrderedRange(
  minimum: number | undefined,
  maximum: number | undefined,
  minimumName: string,
  maximumName: string,
): void {
  if (minimum !== undefined && maximum !== undefined && minimum > maximum) {
    throw new QueryValidationError(`${minimumName} must not exceed ${maximumName}.`);
  }
}

export function validateDateRange(
  from: string | undefined,
  to: string | undefined,
): void {
  if (from !== undefined && to !== undefined && from > to) {
    throw new QueryValidationError("from-date must not be after to-date.");
  }
}

function pathValue(row: Filterable, path: string): unknown {
  let current: unknown = row;
  for (const part of path.split(".")) {
    if (typeof current !== "object" || current === null || Array.isArray(current)) {
      return undefined;
    }
    current = (current as Filterable)[part];
  }
  return current;
}

export function valueAt(row: Filterable, ...paths: readonly string[]): unknown {
  for (const path of paths) {
    const value = pathValue(row, path);
    if (value !== undefined) return value;
  }
  return undefined;
}

export function stringMatches(value: unknown, expected: string | undefined): boolean {
  return (
    expected === undefined ||
    (typeof value === "string" && value.localeCompare(expected, undefined, { sensitivity: "accent" }) === 0)
  );
}

export function booleanMatches(value: unknown, expected: boolean | undefined): boolean {
  return expected === undefined || value === expected;
}

export function numberMatches(
  value: unknown,
  minimum: number | undefined,
  maximum: number | undefined,
): boolean {
  if (minimum === undefined && maximum === undefined) return true;
  return (
    typeof value === "number" &&
    (minimum === undefined || value >= minimum) &&
    (maximum === undefined || value <= maximum)
  );
}

export function filterRows<T>(
  rows: readonly T[],
  predicate: (row: T) => boolean,
): T[] {
  return rows.filter(predicate);
}

export function isObject(value: unknown): value is Filterable {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
