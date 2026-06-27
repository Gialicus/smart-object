import type { z } from "zod";
import type { SmartObjectSchema } from "./types.js";

export type ZodObjectLike = z.ZodObject;
export type ZodUnionRootLike = z.ZodUnion;
export type ZodDiscriminatedUnionLike = z.ZodDiscriminatedUnion;

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
