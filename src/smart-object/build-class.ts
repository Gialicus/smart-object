import type { Operation } from "fast-json-patch";
import type { z } from "zod";
import type { SmartObjectConstructor, SmartObjectInstance, SmartObjectSchema } from "../types.js";
import { getObjectShapeKeys, getUnionObjectKeys, isZodObject } from "../zod-introspect.js";
import { applyOperations } from "./apply-operations.js";
import { definePrototype } from "./define-prototype.js";
import { createInstanceState } from "./instance-state.js";
import { deepClone } from "./json-patch.js";

export function buildSmartObjectClass<T extends SmartObjectSchema>(
  zodSchema: T,
): SmartObjectConstructor<T> {
  type Output = z.infer<T>;
  const keys = isZodObject(zodSchema)
    ? getObjectShapeKeys(zodSchema)
    : getUnionObjectKeys(zodSchema);

  const state = createInstanceState<Output>();

  class SmartObjectClass {
    static fromOperations(
      initial: z.input<T> | undefined,
      operations: Operation[],
    ): SmartObjectInstance<T> {
      const instance = new SmartObjectClass(initial);
      applyOperations(state, zodSchema, instance, operations);
      return instance as unknown as SmartObjectInstance<T>;
    }

    get operations(): readonly Operation[] {
      return [...state.getOperations(this)];
    }

    clearOperations(): void {
      state.getOperations(this).length = 0;
    }

    toJSON(): Output {
      return deepClone(state.getData(this)) as Output;
    }

    constructor(initial?: z.input<T>) {
      state.setData(this, zodSchema.parse(initial ?? {}) as Output);
      state.initOperations(this);
    }
  }

  definePrototype(SmartObjectClass.prototype, state, zodSchema, keys);

  return SmartObjectClass as unknown as SmartObjectConstructor<T>;
}
