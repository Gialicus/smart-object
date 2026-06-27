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

  it("supports z.enum fields", () => {
    const schema = z.object({
      status: z.enum(["draft", "published"]),
    });
    const Model = SmartObject(schema);
    const instance = new Model({ status: "draft" });

    instance.setStatus("published");

    expect(instance.status).toBe("published");
    expect(instance.operations).toEqual([{ op: "replace", path: "/status", value: "published" }]);
  });

  it("supports z.nativeEnum fields", () => {
    enum Role {
      Admin = "admin",
      User = "user",
    }

    const schema = z.object({
      role: z.nativeEnum(Role),
    });
    const Model = SmartObject(schema);
    const instance = new Model({ role: Role.User });

    instance.setRole(Role.Admin);

    expect(instance.role).toBe(Role.Admin);
    expect(instance.operations).toEqual([{ op: "replace", path: "/role", value: "admin" }]);
  });

  it("supports z.tuple fields", () => {
    const schema = z.object({
      point: z.tuple([z.number(), z.number()]),
    });
    const Model = SmartObject(schema);
    const instance = new Model({ point: [1, 2] });

    instance.setPoint([3, 4]);

    expect(instance.point).toEqual([3, 4]);
    expect(instance.operations).toEqual(
      expect.arrayContaining([
        { op: "replace", path: "/point/0", value: 3 },
        { op: "replace", path: "/point/1", value: 4 },
      ]),
    );
  });

  it("supports z.coerce.number fields", () => {
    const schema = z.object({
      amount: z.coerce.number(),
    });
    const Model = SmartObject(schema);
    const instance = new Model({ amount: 10 });

    instance.setAmount(20);

    expect(instance.amount).toBe(20);
    expect(instance.operations).toEqual([{ op: "replace", path: "/amount", value: 20 }]);
  });
});
