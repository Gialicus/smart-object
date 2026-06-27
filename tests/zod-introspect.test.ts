import { describe, expect, it } from "vitest";
import z from "zod";
import {
  getDiscriminator,
  getObjectShapeKeys,
  getUnionObjectKeys,
  isZodDiscriminatedUnion,
  isZodObject,
  isZodUnionOfObjects,
  isZodUnionRoot,
  toSetterMethodName,
} from "../src/zod-introspect.ts";

describe("zod-introspect", () => {
  const objectSchema = z.object({ name: z.string(), age: z.number() });
  const unionSchema = z.union([
    z.object({ name: z.string(), age: z.number() }),
    z.object({ name: z.string(), email: z.string() }),
  ]);
  const discriminatedSchema = z.discriminatedUnion("type", [
    z.object({ type: z.literal("a"), x: z.number() }),
    z.object({ type: z.literal("b"), y: z.number() }),
  ]);

  it("detects z.object schemas", () => {
    expect(isZodObject(objectSchema)).toBe(true);
    expect(isZodObject(z.string())).toBe(false);
  });

  it("detects union root schemas", () => {
    expect(isZodUnionRoot(unionSchema)).toBe(true);
    expect(isZodUnionRoot(discriminatedSchema)).toBe(true);
    expect(isZodUnionRoot(objectSchema)).toBe(false);
  });

  it("detects discriminated unions", () => {
    expect(isZodDiscriminatedUnion(unionSchema)).toBe(false);
    expect(isZodDiscriminatedUnion(discriminatedSchema)).toBe(true);
  });

  it("requires union options to be objects", () => {
    expect(isZodUnionOfObjects(unionSchema)).toBe(true);
    expect(isZodUnionOfObjects(z.union([z.string(), z.number()]))).toBe(false);
  });

  it("collects object and union keys", () => {
    expect(getObjectShapeKeys(objectSchema)).toEqual(["name", "age"]);
    expect(getUnionObjectKeys(unionSchema).sort()).toEqual(["age", "email", "name"]);
  });

  it("reads discriminator from discriminated union", () => {
    expect(getDiscriminator(discriminatedSchema)).toBe("type");
  });

  it("builds setter method names", () => {
    expect(toSetterMethodName("userId")).toBe("setUserId");
    expect(toSetterMethodName("name")).toBe("setName");
  });
});
