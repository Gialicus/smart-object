import { describe, expect, it } from "vitest";
import { Entity, entityInitial } from "../fixtures/entity.ts";

describe("SmartObject union fields", () => {
  it("accepts primitive union values via setPayload", () => {
    const entity = new Entity(entityInitial);

    entity.setPayload(42);

    expect(entity.payload).toBe(42);
    expect(entity.operations).toEqual([{ op: "replace", path: "/payload", value: 42 }]);
  });

  it("replaces nested discriminated union contact variant", () => {
    const entity = new Entity(entityInitial);
    const phoneContact = { type: "phone" as const, number: "+39 333 1234567" };

    entity.setContact(phoneContact);

    expect(entity.contact).toEqual(phoneContact);
    expect(entity.operations).toEqual([
      { op: "remove", path: "/contact/address" },
      { op: "replace", path: "/contact/type", value: "phone" },
      { op: "add", path: "/contact/number", value: "+39 333 1234567" },
    ]);
  });

  it("throws on invalid union field without altering state or operations", () => {
    const entity = new Entity(entityInitial);

    expect(() => entity.setPayload(true as unknown as string)).toThrow();
    expect(entity.payload).toBe("hello");
    expect(entity.operations).toEqual([]);
  });
});
