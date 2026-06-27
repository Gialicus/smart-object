import type { Operation } from "fast-json-patch";
import { SmartObjectError } from "../errors.js";
import type { SmartObjectSchema } from "../types.js";
import { deserializeDataFromPatch } from "./codecs.js";
import type { InstanceState } from "./instance-state.js";
import { applyPatch, deepClone } from "./json-patch.js";

export function applyOperations<T>(
  state: InstanceState<T>,
  zodSchema: SmartObjectSchema,
  instance: object,
  operations: Operation[],
): void {
  if (operations.length === 0) {
    return;
  }

  const data = state.getData(instance);
  const snapshot = deepClone(data) as T;

  try {
    applyPatch(data as object, operations, false, true);
    const deserialized = deserializeDataFromPatch(data as Record<string, unknown>, zodSchema) as T;
    const validated = zodSchema.parse(deserialized) as T;
    state.setData(instance, validated);
    state.getOperations(instance).push(...operations);
  } catch (cause) {
    state.setData(instance, snapshot);
    throw SmartObjectError.invalidReplay(cause);
  }
}
