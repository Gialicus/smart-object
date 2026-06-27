import type { z } from "zod";
import type { SmartObjectSchema } from "./types.js";

export type ZodObjectLike = z.ZodObject;
export type ZodUnionRootLike = z.ZodUnion;
export type ZodDiscriminatedUnionLike = z.ZodDiscriminatedUnion;
export type ZodIntersectionLike = z.ZodIntersection;
export type ZodLazyLike = z.ZodLazy;

export type DiscriminatedVariantInfo = {
  tag: string | number | boolean;
  schema: ZodObjectLike;
  methodName: string;
};

export type RecordFieldInfo = {
  fieldName: string;
  fieldSchema: z.ZodType;
  valueSchema: z.ZodType;
  storage: "record" | "map";
};

export function isZodObject(schema: unknown): schema is ZodObjectLike {
  return (
    typeof schema === "object" &&
    schema !== null &&
    "_zod" in schema &&
    (schema as z.ZodType)._zod.def.type === "object"
  );
}

export function isZodUnionRoot(schema: SmartObjectSchema): schema is ZodUnionRootLike {
  return schema._zod.def.type === "union";
}

export function isZodDiscriminatedUnion(
  schema: ZodUnionRootLike,
): schema is ZodDiscriminatedUnionLike {
  return "discriminator" in schema._zod.def;
}

export function isZodUnionOfObjects(schema: ZodUnionRootLike): boolean {
  return schema.options.length > 0 && schema.options.every(isZodObject);
}

export function getObjectShapeKeys(schema: ZodObjectLike): string[] {
  return Object.keys(schema.shape);
}

export function getUnionObjectKeys(schema: ZodUnionRootLike): string[] {
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

export function getDiscriminator(schema: ZodDiscriminatedUnionLike): string {
  return schema._zod.def.discriminator as string;
}

export function toSetterMethodName(key: string): string {
  return `set${key.charAt(0).toUpperCase()}${key.slice(1)}`;
}

export function toVariantSwitchMethodName(tag: string | number | boolean): string {
  const label = typeof tag === "string" ? tag : String(tag);
  return `switchTo${label.charAt(0).toUpperCase()}${label.slice(1)}`;
}

export function toRecordEntryMethodPrefix(fieldName: string): string {
  return fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
}

export function getLiteralValue(schema: unknown): string | number | boolean | undefined {
  if (typeof schema !== "object" || schema === null || !("_zod" in schema)) {
    return undefined;
  }

  const def = (schema as z.ZodType)._zod.def as {
    type?: string;
    values?: unknown[];
  };

  if (def.type === "literal" && Array.isArray(def.values) && def.values.length === 1) {
    const value = def.values[0];
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      return value;
    }
  }

  return undefined;
}

export function getDiscriminatedVariants(
  schema: ZodDiscriminatedUnionLike,
): DiscriminatedVariantInfo[] {
  const discriminator = getDiscriminator(schema);
  const variants: DiscriminatedVariantInfo[] = [];

  for (const option of schema.options) {
    if (!isZodObject(option)) {
      continue;
    }

    const tagSchema = option.shape[discriminator as keyof typeof option.shape];
    const tag = getLiteralValue(tagSchema);

    if (tag === undefined) {
      continue;
    }

    variants.push({
      tag,
      schema: option,
      methodName: toVariantSwitchMethodName(tag),
    });
  }

  return variants;
}

export function isZodRecord(schema: unknown): schema is z.ZodRecord {
  return (
    typeof schema === "object" &&
    schema !== null &&
    "_zod" in schema &&
    (schema as z.ZodType)._zod.def.type === "record"
  );
}

export function isZodDate(schema: unknown): boolean {
  if (typeof schema !== "object" || schema === null || !("_zod" in schema)) {
    return false;
  }

  const def = (schema as z.ZodType)._zod.def;
  return def.type === "date";
}

export function isZodMap(schema: unknown): schema is z.ZodMap {
  return (
    typeof schema === "object" &&
    schema !== null &&
    "_zod" in schema &&
    (schema as z.ZodType)._zod.def.type === "map"
  );
}

export function isZodSet(schema: unknown): schema is z.ZodSet {
  return (
    typeof schema === "object" &&
    schema !== null &&
    "_zod" in schema &&
    (schema as z.ZodType)._zod.def.type === "set"
  );
}

export function isZodBigInt(schema: unknown): boolean {
  if (typeof schema !== "object" || schema === null || !("_zod" in schema)) {
    return false;
  }

  return (schema as z.ZodType)._zod.def.type === "bigint";
}

export function isStringKeyMap(schema: unknown): schema is z.ZodMap {
  if (!isZodMap(schema)) {
    return false;
  }

  const keyType = unwrapFieldSchema(schema._zod.def.keyType as z.ZodType);
  return keyType._zod.def.type === "string";
}

export function unwrapFieldSchema(schema: z.ZodType): z.ZodType {
  const def = schema._zod.def as {
    type?: string;
    innerType?: z.ZodType;
    getter?: () => z.ZodType;
    in?: z.ZodType;
    out?: z.ZodType;
  };

  if (def.type === "optional" || def.type === "nullable" || def.type === "default") {
    return unwrapFieldSchema(def.innerType as z.ZodType);
  }

  if (def.type === "lazy") {
    return unwrapFieldSchema(def.getter?.() as z.ZodType);
  }

  if (def.type === "pipe") {
    const outType = (def.out as z.ZodType)?._zod.def.type;
    if (outType === "transform") {
      return unwrapFieldSchema(def.in as z.ZodType);
    }

    return unwrapFieldSchema(def.out as z.ZodType);
  }

  return schema;
}

/** @deprecated Use unwrapFieldSchema */
export function unwrapOptionalNullable(schema: z.ZodType): z.ZodType {
  return unwrapFieldSchema(schema);
}

export function isZodIntersection(schema: SmartObjectSchema): schema is ZodIntersectionLike {
  return schema._zod.def.type === "intersection";
}

export function isZodLazy(schema: SmartObjectSchema): schema is ZodLazyLike {
  return schema._zod.def.type === "lazy";
}

export function resolveLazySchema(schema: SmartObjectSchema): SmartObjectSchema {
  if (isZodLazy(schema)) {
    return resolveLazySchema(schema._zod.def.getter() as SmartObjectSchema);
  }

  return schema;
}

function collectEntryField(
  fieldName: string,
  fieldSchema: z.ZodType,
  unwrapped: z.ZodType,
): RecordFieldInfo | undefined {
  if (isZodRecord(unwrapped)) {
    return {
      fieldName,
      fieldSchema,
      valueSchema: unwrapped._zod.def.valueType as z.ZodType,
      storage: "record",
    };
  }

  if (isStringKeyMap(unwrapped)) {
    return {
      fieldName,
      fieldSchema,
      valueSchema: unwrapped._zod.def.valueType as z.ZodType,
      storage: "map",
    };
  }

  return undefined;
}

export function getRecordFields(schema: ZodObjectLike): RecordFieldInfo[] {
  const fields: RecordFieldInfo[] = [];

  for (const [fieldName, fieldSchema] of Object.entries(schema.shape)) {
    const unwrapped = unwrapFieldSchema(fieldSchema as z.ZodType);
    const entryField = collectEntryField(fieldName, fieldSchema as z.ZodType, unwrapped);

    if (entryField) {
      fields.push(entryField);
    }
  }

  return fields;
}

export function getRecordFieldsFromSchema(schema: SmartObjectSchema): RecordFieldInfo[] {
  const resolved = resolveLazySchema(schema);

  if (isZodObject(resolved)) {
    return getRecordFields(resolved);
  }

  if (isZodIntersection(resolved)) {
    const left = resolved._zod.def.left as SmartObjectSchema;
    const right = resolved._zod.def.right as SmartObjectSchema;

    return [...getRecordFieldsFromSchema(left), ...getRecordFieldsFromSchema(right)];
  }

  return [];
}

export function getMergedObjectShape(schema: SmartObjectSchema): Record<string, z.ZodType> {
  const resolved = resolveLazySchema(schema);

  if (isZodObject(resolved)) {
    return resolved.shape as Record<string, z.ZodType>;
  }

  if (isZodIntersection(resolved)) {
    const left = resolved._zod.def.left as SmartObjectSchema;
    const right = resolved._zod.def.right as SmartObjectSchema;

    return {
      ...getMergedObjectShape(left),
      ...getMergedObjectShape(right),
    };
  }

  return {};
}

export function getSchemaShapeKeys(schema: SmartObjectSchema): string[] {
  const resolved = resolveLazySchema(schema);

  if (isZodObject(resolved)) {
    return getObjectShapeKeys(resolved);
  }

  if (isZodUnionRoot(resolved)) {
    return getUnionObjectKeys(resolved);
  }

  if (isZodIntersection(resolved)) {
    const left = resolved._zod.def.left as SmartObjectSchema;
    const right = resolved._zod.def.right as SmartObjectSchema;
    return [...new Set([...getSchemaShapeKeys(left), ...getSchemaShapeKeys(right)])];
  }

  return [];
}

export function getFieldSchema(schema: SmartObjectSchema, key: string): z.ZodType | undefined {
  const resolved = resolveLazySchema(schema);

  if (isZodObject(resolved)) {
    return resolved.shape[key as keyof typeof resolved.shape] as z.ZodType | undefined;
  }

  if (isZodIntersection(resolved)) {
    const left = resolved._zod.def.left as SmartObjectSchema;
    const right = resolved._zod.def.right as SmartObjectSchema;

    return getFieldSchema(left, key) ?? getFieldSchema(right, key);
  }

  return undefined;
}

export function getObjectSchemaForFields(schema: SmartObjectSchema): ZodObjectLike | undefined {
  const resolved = resolveLazySchema(schema);

  if (isZodObject(resolved)) {
    return resolved;
  }

  if (isZodIntersection(resolved)) {
    const left = resolved._zod.def.left as SmartObjectSchema;
    const right = resolved._zod.def.right as SmartObjectSchema;
    const leftObject = getObjectSchemaForFields(left);
    const rightObject = getObjectSchemaForFields(right);

    if (leftObject && rightObject) {
      return leftObject;
    }

    return leftObject ?? rightObject;
  }

  return undefined;
}

export function isObjectLikeRoot(schema: SmartObjectSchema): boolean {
  const resolved = resolveLazySchema(schema);
  return isZodObject(resolved) || isZodIntersection(resolved);
}
