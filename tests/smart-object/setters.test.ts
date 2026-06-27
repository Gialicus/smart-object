import { describe, expect, it } from "vitest";
import { Person, personInitial } from "../fixtures/person.ts";

describe("SmartObject setters", () => {
  it("updates the getter and accumulates a replace operation", () => {
    const person = new Person(personInitial);

    person.setName("Luigi");

    expect(person.name).toBe("Luigi");
    expect(person.operations).toEqual([{ op: "replace", path: "/name", value: "Luigi" }]);
  });

  it("does not accumulate operations when the value is unchanged", () => {
    const person = new Person(personInitial);

    person.setName("Mario");

    expect(person.name).toBe("Mario");
    expect(person.operations).toEqual([]);
  });

  it("throws on invalid value without altering state or operations", () => {
    const person = new Person(personInitial);

    expect(() => person.setAge("invalid" as unknown as number)).toThrow();
    expect(person.age).toBe(30);
    expect(person.operations).toEqual([]);
  });

  it("produces patch on nested objects", () => {
    const person = new Person(personInitial);
    const newAddress = { street: "Via Roma 2", city: "Milano" };

    person.setAddress(newAddress);

    expect(person.address).toEqual(newAddress);
    expect(person.operations).toContainEqual({
      op: "replace",
      path: "/address/street",
      value: "Via Roma 2",
    });
  });

  it("produces operations on array with different value", () => {
    const person = new Person(personInitial);
    const newSkills = [{ name: "Testing", level: 5 }];

    person.setSkills(newSkills);

    expect(person.skills).toEqual(newSkills);
    expect(person.operations).toEqual([
      { op: "remove", path: "/skills/1" },
      { op: "replace", path: "/skills/0/level", value: 5 },
      { op: "replace", path: "/skills/0/name", value: "Testing" },
    ]);
  });

  it("does not accumulate operations when the array is equal", () => {
    const person = new Person(personInitial);

    person.setSkills([...personInitial.skills]);

    expect(person.operations).toEqual([]);
  });

  it("accumulates operations in chronological order", () => {
    const person = new Person(personInitial);

    person.setName("Luigi");
    person.setAge(31);

    expect(person.operations).toEqual([
      { op: "replace", path: "/name", value: "Luigi" },
      { op: "replace", path: "/age", value: 31 },
    ]);
  });
});
