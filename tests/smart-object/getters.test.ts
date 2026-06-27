import { describe, expect, it } from "vitest";
import { Person, personInitial } from "../fixtures/person.ts";

describe("SmartObject getters", () => {
  it("reads primitives, nested objects, and arrays", () => {
    const person = new Person(personInitial);

    expect(person.name).toBe("Mario");
    expect(person.age).toBe(30);
    expect(person.address.street).toBe("Via Roma 1");
    expect(person.skills[0]?.name).toBe("Programming");
  });
});
