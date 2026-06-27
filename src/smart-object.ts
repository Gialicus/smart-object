import type { Operation } from "fast-json-patch";
import jsonPatch from "fast-json-patch";
import type { z } from "zod";
import type { SmartObjectConstructor, SmartObjectInstance, SmartObjectSchema } from "./types.js";

const { applyPatch, compare, deepClone } = jsonPatch;

type ZodObjectLike = z.ZodObject;
type ZodUnionRootLike = z.ZodUnion;
type ZodDiscriminatedUnionLike = z.ZodDiscriminatedUnion;

function isZodObject(schema: unknown): schema is ZodObjectLike {
  return (
    typeof schema === "object" &&
    schema !== null &&
    "_zod" in schema &&
    (schema as z.ZodType)._zod.def.type === "object"
  );
}

function isZodUnionRoot(schema: SmartObjectSchema): schema is ZodUnionRootLike {
  return schema._zod.def.type === "union";
}

function isZodDiscriminatedUnion(schema: ZodUnionRootLike): schema is ZodDiscriminatedUnionLike {
  return "discriminator" in schema._zod.def;
}

function isZodUnionOfObjects(schema: ZodUnionRootLike): boolean {
  return schema.options.length > 0 && schema.options.every(isZodObject);
}

function getObjectShapeKeys(schema: ZodObjectLike): string[] {
  return Object.keys(schema.shape);
}

function getUnionObjectKeys(schema: ZodUnionRootLike): string[] {
  const keys = new Set<string>();

  for (const option of schema.options) {
    if (!isZodObject(option)) {
      continue;
    }

    for (const key of Object.keys(option.shape)) {
      keys.add(key);
    }
  }

  return [...keys];
}

function buildSmartObjectClass<T extends SmartObjectSchema>(zodSchema: T) {
  type Output = z.infer<T>;
  const keys = isZodObject(zodSchema)
    ? getObjectShapeKeys(zodSchema)
    : getUnionObjectKeys(zodSchema);

  class SmartObjectClass {
    #data!: Output;
    #operations: Operation[] = [];

    static fromOperations(
      initial: z.input<T> | undefined,
      operations: Operation[],
    ): SmartObjectInstance<T> {
      const instance = new SmartObjectClass(initial);
      instance.#applyOperations(operations);
      return instance as unknown as SmartObjectInstance<T>;
    }

    #applyOperations(operations: Operation[]): void {
      if (operations.length === 0) {
        return;
      }

      applyPatch(this.#data as object, operations, false, true);
      this.#operations.push(...operations);
    }

    get operations(): readonly Operation[] {
      return this.#operations;
    }

    clearOperations(): void {
      this.#operations.length = 0;
    }

    constructor(initial?: z.input<T>) {
      for (const key of keys) {
        const setMethodName = `set${key.charAt(0).toUpperCase()}${key.slice(1)}`;

        Object.defineProperty(this, key, {
          get: () => (this.#data as Record<string, unknown>)[key],
          enumerable: true,
          configurable: true,
        });

        Object.defineProperty(this, setMethodName, {
          value: isZodObject(zodSchema)
            ? this.#createObjectFieldSetter(zodSchema, key)
            : this.#createUnionFieldSetter(zodSchema, key),
          enumerable: false,
          configurable: true,
          writable: true,
        });
      }

      this.#data = zodSchema.parse(initial ?? {}) as Output;
    }

    #createObjectFieldSetter(schema: ZodObjectLike, key: string): (value: unknown) => void {
      const fieldSchema = schema.shape[key as keyof typeof schema.shape];

      return (value: unknown) => {
        const parsed = fieldSchema.parse(value);
        const beforeData = deepClone(this.#data) as object;
        const afterData = { ...deepClone(this.#data), [key]: parsed };
        const patch = compare(beforeData, afterData);

        if (patch.length === 0) {
          return;
        }

        applyPatch(this.#data as object, patch, false, true);
        this.#operations.push(...patch);
      };
    }

    #getActiveVariantViaDiscriminator(
      schema: ZodDiscriminatedUnionLike,
      data: Output,
    ): ZodObjectLike | undefined {
      const discriminator = schema._zod.def.discriminator as string;
      const tag = (data as Record<string, unknown>)[discriminator];

      for (const option of schema.options) {
        if (!isZodObject(option)) {
          continue;
        }

        const tagSchema = option.shape[discriminator as keyof typeof option.shape];
        if (tagSchema?.safeParse(tag).success) {
          return option;
        }
      }

      return undefined;
    }

    #getMatchingVariantObjects(schema: ZodUnionRootLike): ZodObjectLike[] {
      if (isZodDiscriminatedUnion(schema)) {
        const activeVariant = this.#getActiveVariantViaDiscriminator(schema, this.#data);
        return activeVariant ? [activeVariant] : [];
      }

      return schema.options
        .filter(isZodObject)
        .filter((option) => option.safeParse(this.#data).success);
    }

    #assertKeyAllowedOnMatchingVariants(matchingVariants: ZodObjectLike[], key: string): void {
      if (matchingVariants.length === 0) {
        throw new Error("Cannot set field on invalid union state");
      }

      if (matchingVariants.length === 1) {
        if (!(key in matchingVariants[0].shape)) {
          throw new Error(`Cannot set "${key}" on the active union variant`);
        }
        return;
      }

      if (!matchingVariants.some((variant) => key in variant.shape)) {
        throw new Error(`Cannot set "${key}" on the active union variant`);
      }
    }

    #createUnionFieldSetter(schema: ZodUnionRootLike, key: string): (value: unknown) => void {
      return (value: unknown) => {
        const matchingVariants = this.#getMatchingVariantObjects(schema);
        this.#assertKeyAllowedOnMatchingVariants(matchingVariants, key);

        const beforeData = deepClone(this.#data) as object;
        const candidate = { ...deepClone(this.#data), [key]: value };
        const parsed = schema.parse(candidate) as Output;
        const patch = compare(beforeData, parsed as object);

        if (patch.length === 0) {
          return;
        }

        this.#data = parsed;
        this.#operations.push(...patch);
      };
    }
  }

  return SmartObjectClass as unknown as SmartObjectConstructor<T>;
}

/**
 * Builds a typed SmartObject class from a Zod schema.
 *
 * The goal is to offer mutable, schema-validated objects that also produce an
 * RFC 6902 operation log — useful for audit trails, client/server sync, and
 * event replay without a separate change-tracking layer.
 *
 * Zod is the single source of truth: the same schema drives runtime validation,
 * TypeScript inference, and the dynamically generated read/write API.
 *
 * Initial construction does not emit operations because that state is the baseline
 * every subsequent patch is measured against.
 *
 * @typeParam T - Zod object or union-of-objects schema that defines the instance shape
 * @param zodSchema - A `z.object({ ... })`, `z.union([...])`, or `z.discriminatedUnion(...)` schema
 * @returns An instantiable class with types inferred from the schema
 *
 * @example
 * ```typescript
 * const Person = SmartObject(z.object({
 *     name: z.string(),
 *     age: z.number(),
 * }));
 *
 * const person = new Person({ name: "Mario", age: 30 });
 * person.setName("Luigi");
 * // Only actual changes become operations — suitable for sync payloads
 * console.log(person.operations); // [{ op: "replace", path: "/name", value: "Luigi" }]
 * ```
 */
export function SmartObject<T extends z.ZodObject>(zodSchema: T): SmartObjectConstructor<T>;
export function SmartObject<T extends z.ZodDiscriminatedUnion>(
  zodSchema: T,
): SmartObjectConstructor<T>;
export function SmartObject<T extends z.ZodUnion>(zodSchema: T): SmartObjectConstructor<T>;
export function SmartObject(
  zodSchema: SmartObjectSchema,
): SmartObjectConstructor<SmartObjectSchema> {
  if (isZodObject(zodSchema)) {
    return buildSmartObjectClass(zodSchema);
  }

  if (isZodUnionRoot(zodSchema)) {
    if (!isZodUnionOfObjects(zodSchema)) {
      throw new TypeError("SmartObject union root requires all options to be z.object(...)");
    }

    return buildSmartObjectClass(zodSchema);
  }

  throw new TypeError(
    "SmartObject requires a z.object(...), z.union([...]), or z.discriminatedUnion(...) schema",
  );
}
