import type { Operation } from "fast-json-patch";
import { SmartObjectError } from "../errors.js";
import type { SmartObjectSchema } from "../types.js";
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
    const validated = zodSchema.parse(data) as T;
    state.setData(instance, validated);
    state.getOperations(instance).push(...operations);
  } catch (cause) {
    state.setData(instance, snapshot);
    throw SmartObjectError.invalidReplay(cause);
  }
}
