import type { Operation } from "fast-json-patch";
import type { z } from "zod";

export type { Operation };

/**
 * Schemas accepted by SmartObject: plain objects, unions of objects, intersections, or lazy wrappers at root.
 */
export type SmartObjectSchema =
  | z.ZodObject
  | z.ZodDiscriminatedUnion
  | z.ZodUnion
  | z.ZodIntersection
  | z.ZodLazy;

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
 * `set*` methods for union root schemas.
 *
 * Each setter accepts the union of value types for that key across variants.
 */
export type SetMethodsUnion<T> = {
  [K in AllKeys<T> as `set${Capitalize<string & K>}`]: (
    value: T extends unknown ? (K extends keyof T ? T[K] : never) : never,
  ) => void;
};

type UnionToIntersection<U> = (U extends unknown ? (value: U) => void : never) extends (
  value: infer I,
) => void
  ? I
  : never;

type OmitDiscriminator<T, D extends PropertyKey> = Omit<T, D & keyof T>;

type PerVariantSwitchMethod<T, D extends PropertyKey> =
  T extends Record<D, infer Tag extends string>
    ? Tag extends string
      ? {
          [K in `switchTo${Capitalize<Tag>}`]: (value: OmitDiscriminator<T, D>) => void;
        }
      : never
    : never;

/**
 * Variant switching for union root schemas.
 */
export type VariantSwitchMethods<T> = {
  switchVariant(value: T): void;
};

export type DiscriminatedVariantSwitchMethods<T, D extends PropertyKey> = VariantSwitchMethods<T> &
  UnionToIntersection<PerVariantSwitchMethod<T, D>>;

type EntryValue<T> =
  T extends Record<string, infer V> ? V : T extends Map<string, infer V> ? V : never;

type IsEntryField<T> =
  NonNullable<T> extends Record<string, unknown>
    ? true
    : NonNullable<T> extends Map<string, infer _V>
      ? true
      : false;

/**
 * Dynamic entry accessors for `z.record` and string-key `z.map` fields.
 */
export type RecordFieldMethods<T> = {
  [K in keyof T as IsEntryField<T[K]> extends true ? `get${Capitalize<string & K>}Entry` : never]: (
    key: string,
  ) => EntryValue<NonNullable<T[K]>> | undefined;
} & {
  [K in keyof T as IsEntryField<T[K]> extends true ? `set${Capitalize<string & K>}Entry` : never]: (
    key: string,
    value: EntryValue<NonNullable<T[K]>>,
  ) => void;
} & {
  [K in keyof T as IsEntryField<T[K]> extends true
    ? `delete${Capitalize<string & K>}Entry`
    : never]: (key: string) => void;
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
 * Snapshot serialization — returns a deep clone safe for JSON.stringify.
 */
export type SnapshotAccessor<T extends SmartObjectSchema> = {
  toJSON(): z.infer<T>;
};

/**
 * Flattened data shape for union roots — exposes all variant keys on one surface.
 */
export type UnionDataShape<U> = {
  [K in AllKeys<U>]: U extends unknown ? (K extends keyof U ? U[K] : never) : never;
};

type ObjectLikeSchema<T extends SmartObjectSchema> = T extends
  | z.ZodObject
  | z.ZodIntersection
  | z.ZodLazy
  ? z.infer<T>
  : never;

type UnionRootExtras<T extends SmartObjectSchema> =
  T extends z.ZodDiscriminatedUnion<infer _Options, infer Discriminator extends string>
    ? DiscriminatedVariantSwitchMethods<z.infer<T>, Discriminator>
    : T extends z.ZodUnion
      ? VariantSwitchMethods<z.infer<T>>
      : Record<string, never>;

type ObjectRootExtras<T extends SmartObjectSchema> = T extends z.ZodObject
  ? RecordFieldMethods<z.infer<T>>
  : T extends z.ZodIntersection | z.ZodLazy
    ? RecordFieldMethods<ObjectLikeSchema<T>>
    : Record<string, never>;

/**
 * Full instance contract: validated data shape, typed mutators, and patch log.
 *
 * Intersection types merge these concerns into one consumable surface for callers.
 */
export type SmartObjectInstance<T extends SmartObjectSchema> = (T extends z.ZodObject
  ? z.infer<T>
  : T extends z.ZodIntersection | z.ZodLazy
    ? z.infer<T>
    : UnionDataShape<z.infer<T>>) &
  (T extends z.ZodObject | z.ZodIntersection | z.ZodLazy
    ? SetMethods<z.infer<T>>
    : SetMethodsUnion<z.infer<T>>) &
  ObjectRootExtras<T> &
  UnionRootExtras<T> &
  OperationsAccessor &
  SnapshotAccessor<T>;

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
