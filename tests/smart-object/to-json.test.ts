import { describe, expect, it } from "vitest";
import { Person, personInitial } from "../fixtures/person.ts";

describe("SmartObject toJSON", () => {
  it("returns a deep clone independent from live state", () => {
    const person = new Person(personInitial);
    const snapshot = person.toJSON();

    snapshot.address.street = "Via Snapshot";
    person.setName("Luigi");

    expect(person.address.street).toBe("Via Roma 1");
    expect(snapshot.address.street).toBe("Via Snapshot");
    expect(person.name).toBe("Luigi");
  });

  it("works with JSON.stringify", () => {
    const person = new Person(personInitial);
    person.setName("Luigi");

    expect(JSON.stringify(person)).toBe(
      JSON.stringify({
        name: "Luigi",
        age: 30,
        address: { street: "Via Roma 1", city: "Milano" },
        skills: personInitial.skills,
      }),
    );
  });
});
