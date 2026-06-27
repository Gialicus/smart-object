import { describe, expect, it } from "vitest";
import z from "zod";
import { SmartObject } from "../../src/index.ts";
import { Person, personInitial } from "../fixtures/person.ts";

describe("SmartObject construction", () => {
  it("populates getters without accumulating operations", () => {
    const person = new Person(personInitial);

    expect(person.name).toBe("Mario");
    expect(person.age).toBe(30);
    expect(person.address).toEqual({ street: "Via Roma 1", city: "Milano" });
    expect(person.skills).toEqual(personInitial.skills);
    expect(person.operations).toEqual([]);
  });

  it("throws when constructed with no arguments and all fields are required", () => {
    expect(() => new Person()).toThrow();
  });

  it("throws on partial initial input", () => {
    expect(() => new Person({ name: "Mario" } as typeof personInitial)).toThrow();
  });

  it("accepts constructor with no arguments when schema allows it", () => {
    const optionalSchema = z.object({
      name: z.string().optional(),
      age: z.number().optional(),
    });
    const OptionalPerson = SmartObject(optionalSchema);
    const person = new OptionalPerson();

    expect(person.name).toBeUndefined();
    expect(person.age).toBeUndefined();
    expect(person.operations).toEqual([]);
  });
});
