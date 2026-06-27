import type { SmartObjectSchema } from "../types.js";
import {
  isZodObject,
  toSetterMethodName,
  type ZodObjectLike,
  type ZodUnionRootLike,
} from "../zod-introspect.js";
import type { InstanceState } from "./instance-state.js";
import { readFieldValue } from "./read-field.js";
import { createObjectFieldSetter } from "./setters/object-field.js";
import { createUnionFieldSetter } from "./setters/union-field.js";

export function definePrototype<T>(
  prototype: object,
  state: InstanceState<T>,
  zodSchema: SmartObjectSchema,
  keys: string[],
): void {
  for (const key of keys) {
    const setMethodName = toSetterMethodName(key);

    Object.defineProperty(prototype, key, {
      get(this: object) {
        return readFieldValue((state.getData(this) as Record<string, unknown>)[key]);
      },
      enumerable: true,
      configurable: true,
    });

    Object.defineProperty(prototype, setMethodName, {
      value: isZodObject(zodSchema)
        ? createObjectFieldSetter(state, zodSchema as ZodObjectLike, key)
        : createUnionFieldSetter(state, zodSchema as ZodUnionRootLike, key),
      enumerable: false,
      configurable: true,
      writable: true,
    });
  }
}
