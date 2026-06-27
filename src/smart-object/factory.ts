import type { z } from "zod";
import { SmartObjectError } from "../errors.js";
import type { SmartObjectConstructor, SmartObjectSchema } from "../types.js";
import { isZodObject, isZodUnionOfObjects, isZodUnionRoot } from "../zod-introspect.js";
import { buildSmartObjectClass } from "./build-class.js";

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
      throw SmartObjectError.unsupportedSchema(
        "SmartObject union root requires all options to be z.object(...)",
      );
    }

    return buildSmartObjectClass(zodSchema);
  }

  throw SmartObjectError.unsupportedSchema(
    "SmartObject requires a z.object(...), z.union([...]), or z.discriminatedUnion(...) schema",
  );
}
