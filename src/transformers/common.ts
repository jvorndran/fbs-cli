import { formatClock as formatClockValue } from "../utils/clock";
import { snakeCase } from "../utils/snake-case";
import { parseStatValue as parseNumericStatValue } from "../utils/stat-value";

export type AgentValue =
  | string
  | number
  | boolean
  | AgentObject
  | AgentValue[];

export interface AgentObject {
  [key: string]: AgentValue;
}

export interface ClockValue {
  minutes: number | null;
  seconds: number | null;
}

/** Convert provider and stat names into deterministic snake_case keys. */
export function toSnakeCase(value: string): string {
  return snakeCase(value.trim());
}

/**
 * Remove null and undefined recursively without dropping meaningful falsey
 * values such as zero, false, or an empty string.
 */
export function omitNullish(value: unknown): AgentValue | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    const values: AgentValue[] = [];

    for (const item of value) {
      const transformed = omitNullish(item);
      if (transformed !== undefined) {
        values.push(transformed);
      }
    }

    return values;
  }

  if (typeof value === "object") {
    const result: AgentObject = {};

    for (const [key, item] of Object.entries(value)) {
      const transformed = omitNullish(item);
      if (transformed !== undefined) {
        result[key] = transformed;
      }
    }

    return result;
  }

  return undefined;
}

/** Build an output object while recursively removing nullish values. */
export function compactObject(value: Record<string, unknown>): AgentObject {
  return (omitNullish(value) ?? {}) as AgentObject;
}

/** Recursively snake-case object keys and remove nullish values. */
export function toSnakeCaseValue(value: unknown): AgentValue | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    const values: AgentValue[] = [];

    for (const item of value) {
      const transformed = toSnakeCaseValue(item);
      if (transformed !== undefined) {
        values.push(transformed);
      }
    }

    return values;
  }

  if (typeof value === "object") {
    const result: AgentObject = {};

    for (const [key, item] of Object.entries(value)) {
      const transformed = toSnakeCaseValue(item);
      if (transformed !== undefined) {
        result[toSnakeCase(key)] = transformed;
      }
    }

    return result;
  }

  return undefined;
}

export function toSnakeCaseObject(value: object): AgentObject {
  return (toSnakeCaseValue(value) ?? {}) as AgentObject;
}

/** Return undefined for a grouping object that contains no useful fields. */
export function nonEmptyObject(value: AgentObject): AgentObject | undefined {
  return Object.keys(value).length > 0 ? value : undefined;
}

/** Format CFBD clock objects as MM:SS. */
export function formatClock(clock: ClockValue): string | undefined {
  return formatClockValue(clock);
}

/** Convert only unambiguous integer and decimal stat strings to numbers. */
export function parseStatValue(value: string): string | number {
  return parseNumericStatValue(value);
}

export function combineName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}
