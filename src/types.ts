import type { Operation } from "fast-json-patch";
import type { z } from "zod";

export type { Operation };

/**
 * Schemas accepted by SmartObject: plain objects or discriminated unions of objects.
 */
export type SmartObjectSchema = z.ZodObject | z.ZodDiscriminatedUnion;

/**
 * Compile-time map of `set*` methods for each schema key.
 *
 * Setters are generated at runtime, so mapped types preserve type safety
 * even though the class body is built dynamically from the Zod shape.
 */
export type SetMethods<T> = {
  [K in keyof T as `set${Capitalize<string & K>}`]: (value: T[K]) => void;
};

/**
 * All keys across union members — `keyof` on a union only yields common keys.
 */
export type AllKeys<T> = T extends unknown ? keyof T : never;

/**
 * `set*` methods for discriminated-union root schemas.
 *
 * Each setter accepts the union of value types for that key across variants.
 */
export type SetMethodsUnion<T> = {
  [K in AllKeys<T> as `set${Capitalize<string & K>}`]: (
    value: T extends unknown ? (K extends keyof T ? T[K] : never) : never,
  ) => void;
};

/**
 * Read/write surface and audit trail are separate concerns in the public API.
 *
 * Grouping operations here keeps mutation methods focused on state while
 * consumers can still inspect or reset the patch history explicitly.
 */
export type OperationsAccessor = {
  /** Chronological RFC 6902 log — order matters for replay and sync */
  readonly operations: readonly Operation[];
  /** Drops accumulated patches after persist/sync without rolling back state */
  clearOperations(): void;
};

/**
 * Flattened data shape for discriminated unions — exposes all variant keys on one surface.
 */
export type UnionDataShape<U> = {
  [K in AllKeys<U>]: U extends unknown ? (K extends keyof U ? U[K] : never) : never;
};

/**
 * Full instance contract: validated data shape, typed mutators, and patch log.
 *
 * Intersection types merge these concerns into one consumable surface for callers.
 */
export type SmartObjectInstance<T extends SmartObjectSchema> = (T extends z.ZodDiscriminatedUnion
  ? UnionDataShape<z.infer<T>>
  : z.infer<T>) &
  (T extends z.ZodObject ? SetMethods<z.infer<T>> : SetMethodsUnion<z.infer<T>>) &
  OperationsAccessor;

/**
 * Constructor type for a SmartObject class, including replay as a first-class capability.
 *
 * `fromOperations` lives on the constructor type because replay is a core use case,
 * not an optional utility added after the fact.
 */
export type SmartObjectConstructor<T extends SmartObjectSchema> = {
  new (initial?: z.input<T>): SmartObjectInstance<T>;
  fromOperations(initial: z.input<T> | undefined, operations: Operation[]): SmartObjectInstance<T>;
};
