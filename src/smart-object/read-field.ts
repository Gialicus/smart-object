import { deepClone } from "./json-patch.js";

export function readFieldValue(value: unknown): unknown {
  if (
    value instanceof Date ||
    value instanceof Map ||
    value instanceof Set ||
    typeof value === "bigint"
  ) {
    return deepClone(value);
  }

  if (typeof value === "object" && value !== null) {
    return deepClone(value);
  }

  return value;
}
