import type { z } from "zod";
import { SmartObjectError } from "../../errors.js";
import type { SmartObjectSchema } from "../../types.js";
import { serializeDataForPatch, serializePatchValue } from "../codecs.js";
import type { InstanceState } from "../instance-state.js";
import { compare, deepClone } from "../json-patch.js";

export function createObjectFieldSetter<T>(
  state: InstanceState<T>,
  key: string,
  fieldSchema: z.ZodType,
  rootSchema: SmartObjectSchema,
) {
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

    const patch = compare(
      serializeDataForPatch(beforeData as Record<string, unknown>, rootSchema),
      serializeDataForPatch(afterData, rootSchema),
    ).map((operation) => {
      if ("value" in operation && operation.path === `/${key}`) {
        return {
          ...operation,
          value: serializePatchValue(rootSchema, key, parsed),
        };
      }

      return operation;
    });

    if (patch.length === 0) {
      return;
    }

    afterData[key] = parsed;
    state.setData(this, afterData as T);
    state.getOperations(this).push(...patch);
  };
}
