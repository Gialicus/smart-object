import type { z } from "zod";
import type { SmartObjectSchema } from "../types.js";
import {
  getFieldSchema,
  getMergedObjectShape,
  isZodDate,
  unwrapOptionalNullable,
} from "../zod-introspect.js";

function deserializeDateValue(value: unknown): unknown {
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return value;
}

export function serializeFieldValue(fieldSchema: z.ZodType, value: unknown): unknown {
  if (isZodDate(unwrapOptionalNullable(fieldSchema)) && value instanceof Date) {
    return value.toISOString();
  }

  return value;
}

export function deserializeFieldValue(fieldSchema: z.ZodType, value: unknown): unknown {
  if (isZodDate(unwrapOptionalNullable(fieldSchema)) && typeof value === "string") {
    return deserializeDateValue(value);
  }

  return value;
}

function getShape(schema: SmartObjectSchema): Record<string, z.ZodType> {
  return getMergedObjectShape(schema);
}

export function serializeDataForPatch<T extends Record<string, unknown>>(
  data: T,
  rootSchema: SmartObjectSchema,
): T {
  const shape = getShape(rootSchema);

  if (Object.keys(shape).length === 0) {
    return data;
  }

  return serializeObjectValues(data, shape) as T;
}

export function deserializeDataFromPatch<T extends Record<string, unknown>>(
  data: T,
  rootSchema: SmartObjectSchema,
): T {
  const shape = getShape(rootSchema);

  if (Object.keys(shape).length === 0) {
    return data;
  }

  return deserializeObjectValues(data, shape) as T;
}

function serializeObjectValues(
  value: Record<string, unknown>,
  shape: Record<string, z.ZodType>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, fieldValue] of Object.entries(value)) {
    const fieldSchema = shape[key];

    if (fieldSchema) {
      result[key] = serializeFieldValue(fieldSchema, fieldValue);
    } else {
      result[key] = fieldValue;
    }
  }

  return result;
}

function deserializeObjectValues(
  value: Record<string, unknown>,
  shape: Record<string, z.ZodType>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, fieldValue] of Object.entries(value)) {
    const fieldSchema = shape[key];

    if (fieldSchema) {
      result[key] = deserializeFieldValue(fieldSchema, fieldValue);
    } else {
      result[key] = fieldValue;
    }
  }

  return result;
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

  return serializeFieldValue(fieldSchema, value);
}
