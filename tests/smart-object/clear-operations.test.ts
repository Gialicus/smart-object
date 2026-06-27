import { describe, expect, it } from "vitest";
import { Person, personInitial } from "../fixtures/person.ts";

describe("SmartObject clearOperations", () => {
  it("clears the accumulator without altering state", () => {
    const person = new Person(personInitial);

    person.setName("Luigi");
    person.clearOperations();

    expect(person.name).toBe("Luigi");
    expect(person.operations).toEqual([]);
  });
});
