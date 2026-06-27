import type { SmartObjectSchema } from "../types.js";
import {
  getDiscriminatedVariants,
  getDiscriminator,
  getFieldSchema,
  getRecordFieldsFromSchema,
  isObjectLikeRoot,
  isZodDiscriminatedUnion,
  isZodUnionRoot,
  toRecordEntryMethodPrefix,
  toSetterMethodName,
  type ZodUnionRootLike,
} from "../zod-introspect.js";
import type { InstanceState } from "./instance-state.js";
import { readFieldValue } from "./read-field.js";
import { createObjectFieldSetter } from "./setters/object-field.js";
import {
  createRecordEntryDeleter,
  createRecordEntryGetter,
  createRecordEntrySetter,
} from "./setters/record-field.js";
import { createUnionFieldSetter } from "./setters/union-field.js";
import { createSwitchToVariant, createSwitchVariant } from "./setters/variant-switch.js";

function defineRecordFieldMethods<T>(
  prototype: object,
  state: InstanceState<T>,
  zodSchema: SmartObjectSchema,
): void {
  for (const field of getRecordFieldsFromSchema(zodSchema)) {
    const prefix = toRecordEntryMethodPrefix(field.fieldName);

    Object.defineProperty(prototype, `get${prefix}Entry`, {
      value: createRecordEntryGetter(state, field),
      enumerable: false,
      configurable: true,
      writable: true,
    });

    Object.defineProperty(prototype, `set${prefix}Entry`, {
      value: createRecordEntrySetter(state, zodSchema, field),
      enumerable: false,
      configurable: true,
      writable: true,
    });

    Object.defineProperty(prototype, `delete${prefix}Entry`, {
      value: createRecordEntryDeleter(state, zodSchema, field),
      enumerable: false,
      configurable: true,
      writable: true,
    });
  }
}

function defineUnionRootMethods<T>(
  prototype: object,
  state: InstanceState<T>,
  zodSchema: ZodUnionRootLike,
): void {
  Object.defineProperty(prototype, "switchVariant", {
    value: createSwitchVariant(state, zodSchema),
    enumerable: false,
    configurable: true,
    writable: true,
  });

  if (isZodDiscriminatedUnion(zodSchema)) {
    const discriminator = getDiscriminator(zodSchema);

    for (const variant of getDiscriminatedVariants(zodSchema)) {
      Object.defineProperty(prototype, variant.methodName, {
        value: createSwitchToVariant(state, zodSchema, variant.schema, variant.tag, discriminator),
        enumerable: false,
        configurable: true,
        writable: true,
      });
    }
  }
}

export function definePrototype<T>(
  prototype: object,
  state: InstanceState<T>,
  zodSchema: SmartObjectSchema,
  keys: string[],
): void {
  const objectSchema = isObjectLikeRoot(zodSchema) ? zodSchema : undefined;

  for (const key of keys) {
    const setMethodName = toSetterMethodName(key);
    const fieldSchema = getFieldSchema(zodSchema, key);

    Object.defineProperty(prototype, key, {
      get(this: object) {
        return readFieldValue((state.getData(this) as Record<string, unknown>)[key]);
      },
      enumerable: true,
      configurable: true,
    });

    Object.defineProperty(prototype, setMethodName, {
      value:
        fieldSchema && isObjectLikeRoot(zodSchema)
          ? createObjectFieldSetter(state, key, fieldSchema, zodSchema)
          : createUnionFieldSetter(state, zodSchema as ZodUnionRootLike, key),
      enumerable: false,
      configurable: true,
      writable: true,
    });
  }

  if (objectSchema) {
    defineRecordFieldMethods(prototype, state, zodSchema);
  }

  if (isZodUnionRoot(zodSchema)) {
    defineUnionRootMethods(prototype, state, zodSchema);
  }
}
