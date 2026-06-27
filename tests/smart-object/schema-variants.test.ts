import { describe, expect, it } from "vitest";
import z from "zod";
import { SmartObject } from "../../src/index.ts";

describe("SmartObject schema variants", () => {
  it("supports z.default and optional fields", () => {
    const schema = z.object({
      name: z.string().default("Anonymous"),
      age: z.number().optional(),
    });
    const Model = SmartObject(schema);
    const instance = new Model();

    expect(instance.name).toBe("Anonymous");
    expect(instance.age).toBeUndefined();
    expect(instance.operations).toEqual([]);
  });

  it("supports nullable fields", () => {
    const schema = z.object({
      nickname: z.string().nullable(),
    });
    const Model = SmartObject(schema);
    const instance = new Model({ nickname: null });

    instance.setNickname("Mario");

    expect(instance.nickname).toBe("Mario");
    expect(instance.operations).toEqual([{ op: "replace", path: "/nickname", value: "Mario" }]);
  });
});
