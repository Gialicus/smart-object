import { SmartObjectError } from "../../errors.js";
import type { ZodObjectLike } from "../../zod-introspect.js";
import type { InstanceState } from "../instance-state.js";
import { applyPatch, compare, deepClone } from "../json-patch.js";

export function createObjectFieldSetter<T>(
  state: InstanceState<T>,
  schema: ZodObjectLike,
  key: string,
) {
  const fieldSchema = schema.shape[key as keyof typeof schema.shape];

  return function (this: object, value: unknown) {
    let parsed: unknown;

    try {
      parsed = fieldSchema.parse(value);
    } catch (cause) {
      throw SmartObjectError.invalidValue(key, cause);
    }

    const data = state.getData(this);
    const beforeData = deepClone(data) as object;
    const afterData = deepClone(data) as Record<string, unknown>;
    afterData[key] = parsed;
    const patch = compare(beforeData, afterData);

    if (patch.length === 0) {
      return;
    }

    applyPatch(data as object, patch, false, true);
    state.getOperations(this).push(...patch);
  };
}
