import type { z } from "zod";
import type { SmartObjectSchema } from "../types.js";
import {
  getFieldSchema,
  getMergedObjectShape,
  isZodRecord,
  unwrapFieldSchema,
} from "../zod-introspect.js";

type SchemaDef = {
  type?: string;
  shape?: Record<string, z.ZodType>;
  element?: z.ZodType;
  valueType?: z.ZodType;
  keyType?: z.ZodType;
};

function getSchemaDef(schema: z.ZodType): SchemaDef {
  return schema._zod.def as SchemaDef;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function serializeValue(schema: z.ZodType, value: unknown): unknown {
  const inner = unwrapFieldSchema(schema);
  const def = getSchemaDef(inner);

  if (value instanceof Date && def.type === "date") {
    return value.toISOString();
  }

  if (typeof value === "bigint" && def.type === "bigint") {
    return value.toString();
  }

  if (value instanceof Map && def.type === "map") {
    const keySchema = def.keyType as z.ZodType;
    const valueSchema = def.valueType as z.ZodType;
    const result: Record<string, unknown> = {};

    for (const [key, entryValue] of value.entries()) {
      const serializedKey = serializeValue(keySchema, key);
      if (typeof serializedKey === "string") {
        result[serializedKey] = serializeValue(valueSchema, entryValue);
      }
    }

    return result;
  }

  if (value instanceof Set && def.type === "set") {
    const valueSchema = def.valueType as z.ZodType;
    return [...value].map((item) => serializeValue(valueSchema, item));
  }

  if (def.type === "object" && isPlainObject(value)) {
    const shape = def.shape ?? {};
    const result: Record<string, unknown> = {};

    for (const [key, fieldValue] of Object.entries(value)) {
      const fieldSchema = shape[key];
      result[key] = fieldSchema ? serializeValue(fieldSchema, fieldValue) : fieldValue;
    }

    return result;
  }

  if (def.type === "array" && Array.isArray(value)) {
    const elementSchema = def.element as z.ZodType;
    return value.map((item) => serializeValue(elementSchema, item));
  }

  if (def.type === "record" && isPlainObject(value)) {
    const valueSchema = def.valueType as z.ZodType;
    const result: Record<string, unknown> = {};

    for (const [key, fieldValue] of Object.entries(value)) {
      result[key] = serializeValue(valueSchema, fieldValue);
    }

    return result;
  }

  return value;
}

export function deserializeValue(schema: z.ZodType, value: unknown): unknown {
  const inner = unwrapFieldSchema(schema);
  const def = getSchemaDef(inner);

  if (def.type === "date" && typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }

    return value;
  }

  if (def.type === "bigint" && typeof value === "string") {
    try {
      return BigInt(value);
    } catch {
      return value;
    }
  }

  if (def.type === "map" && isPlainObject(value)) {
    const keySchema = def.keyType as z.ZodType;
    const valueSchema = def.valueType as z.ZodType;
    const map = new Map<unknown, unknown>();

    for (const [key, entryValue] of Object.entries(value)) {
      map.set(deserializeValue(keySchema, key), deserializeValue(valueSchema, entryValue));
    }

    return map;
  }

  if (def.type === "set" && Array.isArray(value)) {
    const valueSchema = def.valueType as z.ZodType;
    return new Set(value.map((item) => deserializeValue(valueSchema, item)));
  }

  if (def.type === "object" && isPlainObject(value)) {
    const shape = def.shape ?? {};
    const result: Record<string, unknown> = {};

    for (const [key, fieldValue] of Object.entries(value)) {
      const fieldSchema = shape[key];
      result[key] = fieldSchema ? deserializeValue(fieldSchema, fieldValue) : fieldValue;
    }

    return result;
  }

  if (def.type === "array" && Array.isArray(value)) {
    const elementSchema = def.element as z.ZodType;
    return value.map((item) => deserializeValue(elementSchema, item));
  }

  if (def.type === "record" && isPlainObject(value)) {
    const valueSchema = def.valueType as z.ZodType;
    const result: Record<string, unknown> = {};

    for (const [key, fieldValue] of Object.entries(value)) {
      result[key] = deserializeValue(valueSchema, fieldValue);
    }

    return result;
  }

  return value;
}

export function serializeDataForPatch<T extends Record<string, unknown>>(
  data: T,
  rootSchema: SmartObjectSchema,
): T {
  const shape = getMergedObjectShape(rootSchema);

  if (Object.keys(shape).length === 0) {
    return data;
  }

  const result: Record<string, unknown> = {};

  for (const [key, fieldValue] of Object.entries(data)) {
    const fieldSchema = shape[key];
    result[key] = fieldSchema ? serializeValue(fieldSchema, fieldValue) : fieldValue;
  }

  return result as T;
}

export function deserializeDataFromPatch<T extends Record<string, unknown>>(
  data: T,
  rootSchema: SmartObjectSchema,
): T {
  const shape = getMergedObjectShape(rootSchema);

  if (Object.keys(shape).length === 0) {
    return data;
  }

  const result: Record<string, unknown> = {};

  for (const [key, fieldValue] of Object.entries(data)) {
    const fieldSchema = shape[key];
    result[key] = fieldSchema ? deserializeValue(fieldSchema, fieldValue) : fieldValue;
  }

  return result as T;
}

export function serializePatchValue(
  rootSchema: SmartObjectSchema,
  key: string,
  value: unknown,
): unknown {
  const fieldSchema = getFieldSchema(rootSchema, key);

  if (!fieldSchema) {
    return value;
  }

  return serializeValue(fieldSchema, value);
}

export function serializeEntryPatchValue(
  fieldSchema: z.ZodType,
  valueSchema: z.ZodType,
  value: unknown,
): unknown {
  const inner = unwrapFieldSchema(fieldSchema);

  if (isZodRecord(inner)) {
    return serializeValue(valueSchema, value);
  }

  if (isPlainObject(value)) {
    return serializeValue(fieldSchema, value);
  }

  return serializeValue(valueSchema, value);
}

/** Serialize a single entry container for RFC 6902 compare (record or map field). */
export function serializeEntryContainer(
  fieldSchema: z.ZodType,
  container: unknown,
): Record<string, unknown> {
  const serialized = serializeValue(fieldSchema, container);
  return isPlainObject(serialized) ? serialized : {};
}

/** @deprecated Use serializeValue */
export function serializeFieldValue(fieldSchema: z.ZodType, value: unknown): unknown {
  return serializeValue(fieldSchema, value);
}

/** @deprecated Use deserializeValue */
export function deserializeFieldValue(fieldSchema: z.ZodType, value: unknown): unknown {
  return deserializeValue(fieldSchema, value);
}
