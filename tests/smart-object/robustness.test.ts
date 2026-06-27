import { describe, expect, it } from "vitest";
import type { Operation } from "../../src/index.ts";
import { SmartObjectError } from "../../src/index.ts";
import { clickInitial, Event } from "../fixtures/event.ts";
import { Person, personInitial } from "../fixtures/person.ts";

describe("SmartObject robustness", () => {
  it("prevents silent mutation on nested objects and arrays", () => {
    const person = new Person(personInitial);

    person.address.street = "Via Mutata";
    person.skills.push({ name: "Hacking", level: 99 });

    expect(person.address.street).toBe("Via Roma 1");
    expect(person.skills).toHaveLength(2);
    expect(person.operations).toEqual([]);
  });

  it("returns a defensive copy from operations getter", () => {
    const person = new Person(personInitial);

    person.setName("Luigi");
    const ops = person.operations;

    (ops as Operation[]).push({ op: "replace", path: "/age", value: 99 });

    expect(person.operations).toEqual([{ op: "replace", path: "/name", value: "Luigi" }]);
  });

  it("throws SmartObjectError on invalid setter value with field path", () => {
    const person = new Person(personInitial);

    try {
      person.setAge("invalid" as unknown as number);
      expect.unreachable("expected throw");
    } catch (error) {
      expect(error).toBeInstanceOf(SmartObjectError);
      expect((error as SmartObjectError).code).toBe("InvalidValue");
      expect((error as SmartObjectError).field).toBe("age");
    }
  });

  it("throws SmartObjectError on invalid union field", () => {
    const event = new Event(clickInitial);

    try {
      event.setDelta(5);
      expect.unreachable("expected throw");
    } catch (error) {
      expect(error).toBeInstanceOf(SmartObjectError);
      expect((error as SmartObjectError).code).toBe("InvalidUnionField");
      expect((error as SmartObjectError).field).toBe("delta");
    }
  });

  it("throws SmartObjectError on invalid replay operations", () => {
    expect(() =>
      Person.fromOperations(personInitial, [
        { op: "replace", path: "/age", value: "not-a-number" },
      ]),
    ).toThrow(SmartObjectError);

    const person = new Person(personInitial);

    expect(() =>
      Person.fromOperations(personInitial, [
        { op: "replace", path: "/age", value: "not-a-number" },
      ]),
    ).toThrow(SmartObjectError);

    expect(person.age).toBe(30);
  });

  it("does not accumulate operations when replay validation fails", () => {
    expect(() =>
      Person.fromOperations(personInitial, [{ op: "replace", path: "/age", value: "invalid" }]),
    ).toThrow(SmartObjectError);
  });
});
