import { deepClone } from "./json-patch.js";

export function readFieldValue(value: unknown): unknown {
  if (typeof value === "object" && value !== null) {
    return deepClone(value);
  }

  return value;
}
