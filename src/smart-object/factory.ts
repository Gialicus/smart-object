import type { z } from "zod";
import { SmartObjectError } from "../errors.js";
import type { SmartObjectConstructor, SmartObjectSchema } from "../types.js";
import {
  isZodIntersection,
  isZodObject,
  isZodUnionOfObjects,
  isZodUnionRoot,
  resolveLazySchema,
} from "../zod-introspect.js";
import { buildSmartObjectClass } from "./build-class.js";

function assertBuildableSchema(schema: SmartObjectSchema): void {
  const resolved = resolveLazySchema(schema);

  if (isZodObject(resolved)) {
    return;
  }

  if (isZodUnionRoot(resolved)) {
    if (!isZodUnionOfObjects(resolved)) {
      throw SmartObjectError.unsupportedSchema(
        "SmartObject union root requires all options to be z.object(...)",
      );
    }

    return;
  }

  if (isZodIntersection(resolved)) {
    const left = resolved._zod.def.left as SmartObjectSchema;
    const right = resolved._zod.def.right as SmartObjectSchema;
    assertBuildableSchema(left);
    assertBuildableSchema(right);
    return;
  }

  throw SmartObjectError.unsupportedSchema(
    "SmartObject requires a buildable z.object(...), z.union([...]), z.discriminatedUnion(...), z.intersection(...), or z.lazy(...) schema",
  );
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
 * @typeParam T - Zod schema that defines the instance shape (object, union, intersection, or lazy root)
 * @param zodSchema - A `z.object({ ... })`, `z.union([...])`, `z.discriminatedUnion(...)`, `z.intersection(...)`, or `z.lazy(...)` schema
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
export function SmartObject<T extends z.ZodIntersection>(zodSchema: T): SmartObjectConstructor<T>;
export function SmartObject<T extends z.ZodLazy>(zodSchema: T): SmartObjectConstructor<T>;
export function SmartObject(
  zodSchema: SmartObjectSchema,
): SmartObjectConstructor<SmartObjectSchema> {
  assertBuildableSchema(zodSchema);
  return buildSmartObjectClass(zodSchema);
}
