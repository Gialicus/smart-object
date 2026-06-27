import jsonPatch from "fast-json-patch";

export const { applyPatch, compare } = jsonPatch;

export function deepClone<T>(value: T): T {
  if (value instanceof Date) {
    return new Date(value.getTime()) as T;
  }

  if (typeof value === "bigint") {
    return value;
  }

  if (value instanceof Map) {
    return new Map(
      [...value.entries()].map(([key, nestedValue]) => [key, deepClone(nestedValue)]),
    ) as T;
  }

  if (value instanceof Set) {
    return new Set([...value].map((item) => deepClone(item))) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => deepClone(item)) as T;
  }

  if (typeof value === "object" && value !== null) {
    const result: Record<string, unknown> = {};

    for (const [key, nestedValue] of Object.entries(value)) {
      result[key] = deepClone(nestedValue);
    }

    return result as T;
  }

  return value;
}
