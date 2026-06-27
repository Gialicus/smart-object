import { describe, expect, it } from "vitest";
import { Person, personInitial } from "../fixtures/person.ts";

describe("SmartObject fromOperations", () => {
  it("replays operations on initial and copies them into the accumulator", () => {
    const source = new Person(personInitial);

    source.setName("Luigi");
    source.setAge(31);

    const operations = [...source.operations];
    const replayed = Person.fromOperations(personInitial, operations);

    expect(replayed.name).toBe("Luigi");
    expect(replayed.age).toBe(31);
    expect(replayed.operations).toEqual(operations);
  });

  it("throws on partial initial baseline", () => {
    expect(() => Person.fromOperations({ name: "Mario" } as typeof personInitial, [])).toThrow();
  });
});
