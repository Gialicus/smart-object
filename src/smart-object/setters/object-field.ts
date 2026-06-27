import type { Operation } from "fast-json-patch";
import type { z } from "zod";
import { SmartObjectError } from "../../errors.js";
import type { SmartObjectSchema } from "../../types.js";
import { unwrapFieldSchema } from "../../zod-introspect.js";
import { serializeDataForPatch, serializeValue } from "../codecs.js";
import type { InstanceState } from "../instance-state.js";
import { compare, deepClone } from "../json-patch.js";

function normalizeFieldPatch(
  patch: Operation[],
  key: string,
  fieldSchema: z.ZodType,
  parsed: unknown,
  beforeSerialized: Record<string, unknown>,
): Operation[] {
  const inner = unwrapFieldSchema(fieldSchema);
  const defType = inner._zod.def.type;

  if (defType !== "set" && defType !== "map") {
    return patch.map((operation) => {
      if ("value" in operation && operation.path === `/${key}`) {
        return {
          ...operation,
          value: serializeValue(fieldSchema, parsed),
        };
      }

      return operation;
    });
  }

  const prefix = `/${key}`;
  const touchesField = patch.some(
    (operation) => operation.path === prefix || operation.path.startsWith(`${prefix}/`),
  );

  if (!touchesField) {
    return patch;
  }

  const hadField = Object.hasOwn(beforeSerialized, key) && beforeSerialized[key] !== undefined;

  return [
    {
      op: hadField ? "replace" : "add",
      path: prefix,
      value: serializeValue(fieldSchema, parsed),
    },
  ];
}

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

    const beforeSerialized = serializeDataForPatch(
      beforeData as Record<string, unknown>,
      rootSchema,
    );
    const afterSerialized = serializeDataForPatch(afterData, rootSchema);

    const patch = normalizeFieldPatch(
      compare(beforeSerialized, afterSerialized),
      key,
      fieldSchema,
      parsed,
      beforeSerialized,
    );

    if (patch.length === 0) {
      return;
    }

    afterData[key] = parsed;
    state.setData(this, afterData as T);
    state.getOperations(this).push(...patch);
  };
}
