import { describe, expect, expectTypeOf, it } from "vitest";
import z from "zod";
import type { Operation, SmartObjectInstance } from "../src/index.ts";
import { SmartObject } from "../src/index.ts";

const personSchema = z.object({
  name: z.string(),
  age: z.number(),
  address: z.object({
    street: z.string(),
    city: z.string(),
  }),
  skills: z.array(
    z.object({
      name: z.string(),
      level: z.number(),
    }),
  ),
});

const Person = SmartObject(personSchema);

type PersonInstance = SmartObjectInstance<typeof personSchema>;

const initial = {
  name: "Mario",
  age: 30,
  address: { street: "Via Roma 1", city: "Milano" },
  skills: [
    { name: "Programming", level: 10 },
    { name: "Design", level: 8 },
  ],
};

describe("SmartObject", () => {
  describe("construction", () => {
    it("populates getters without accumulating operations", () => {
      const person = new Person(initial);

      expect(person.name).toBe("Mario");
      expect(person.age).toBe(30);
      expect(person.address).toEqual({ street: "Via Roma 1", city: "Milano" });
      expect(person.skills).toEqual(initial.skills);
      expect(person.operations).toEqual([]);
    });

    it("throws when constructed with no arguments and all fields are required", () => {
      expect(() => new Person()).toThrow();
    });

    it("throws on partial initial input", () => {
      expect(() => new Person({ name: "Mario" } as typeof initial)).toThrow();
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

  describe("getter", () => {
    it("reads primitives, nested objects, and arrays", () => {
      const person = new Person(initial);

      expect(person.name).toBe("Mario");
      expect(person.age).toBe(30);
      expect(person.address.street).toBe("Via Roma 1");
      expect(person.skills[0]?.name).toBe("Programming");
    });
  });

  describe("set*", () => {
    it("updates the getter and accumulates a replace operation", () => {
      const person = new Person(initial);

      person.setName("Luigi");

      expect(person.name).toBe("Luigi");
      expect(person.operations).toEqual([{ op: "replace", path: "/name", value: "Luigi" }]);
    });

    it("does not accumulate operations when the value is unchanged", () => {
      const person = new Person(initial);

      person.setName("Mario");

      expect(person.name).toBe("Mario");
      expect(person.operations).toEqual([]);
    });

    it("throws on invalid value without altering state or operations", () => {
      const person = new Person(initial);

      expect(() => person.setAge("invalid" as unknown as number)).toThrow();
      expect(person.age).toBe(30);
      expect(person.operations).toEqual([]);
    });

    it("produces patch on nested objects", () => {
      const person = new Person(initial);
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
      const person = new Person(initial);
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
      const person = new Person(initial);

      person.setSkills([...initial.skills]);

      expect(person.operations).toEqual([]);
    });

    it("accumulates operations in chronological order", () => {
      const person = new Person(initial);

      person.setName("Luigi");
      person.setAge(31);

      expect(person.operations).toEqual([
        { op: "replace", path: "/name", value: "Luigi" },
        { op: "replace", path: "/age", value: 31 },
      ]);
    });
  });

  describe("clearOperations", () => {
    it("clears the accumulator without altering state", () => {
      const person = new Person(initial);

      person.setName("Luigi");
      person.clearOperations();

      expect(person.name).toBe("Luigi");
      expect(person.operations).toEqual([]);
    });
  });

  describe("fromOperations", () => {
    it("replays operations on initial and copies them into the accumulator", () => {
      const source = new Person(initial);

      source.setName("Luigi");
      source.setAge(31);

      const operations = [...source.operations];
      const replayed = Person.fromOperations(initial, operations);

      expect(replayed.name).toBe("Luigi");
      expect(replayed.age).toBe(31);
      expect(replayed.operations).toEqual(operations);
    });

    it("throws on partial initial baseline", () => {
      expect(() => Person.fromOperations({ name: "Mario" } as typeof initial, [])).toThrow();
    });
  });
});

const entitySchema = z.object({
  id: z.string(),
  payload: z.union([z.string(), z.number()]),
  contact: z.discriminatedUnion("type", [
    z.object({ type: z.literal("email"), address: z.string() }),
    z.object({ type: z.literal("phone"), number: z.string() }),
  ]),
});

const Entity = SmartObject(entitySchema);

type EntityInstance = SmartObjectInstance<typeof entitySchema>;

const entityInitial = {
  id: "e-1",
  payload: "hello",
  contact: { type: "email" as const, address: "mario@example.com" },
};

const eventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("click"), x: z.number(), y: z.number() }),
  z.object({ type: z.literal("scroll"), delta: z.number() }),
]);

const Event = SmartObject(eventSchema);

type EventInstance = SmartObjectInstance<typeof eventSchema>;

const clickInitial = { type: "click" as const, x: 10, y: 20 };

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

describe("SmartObject discriminated union root", () => {
  it("populates getters for the active variant without operations", () => {
    const event = new Event(clickInitial);

    expect(event.type).toBe("click");
    expect(event.x).toBe(10);
    expect(event.y).toBe(20);
    expect(event.operations).toEqual([]);
  });

  it("updates variant fields and accumulates replace operations", () => {
    const event = new Event(clickInitial);

    event.setX(15);
    event.setY(25);

    expect(event.x).toBe(15);
    expect(event.y).toBe(25);
    expect(event.operations).toEqual([
      { op: "replace", path: "/x", value: 15 },
      { op: "replace", path: "/y", value: 25 },
    ]);
  });

  it("throws when setting a field invalid for the active variant", () => {
    const event = new Event(clickInitial);

    expect(() => event.setDelta(5)).toThrow();
    expect(event.x).toBe(10);
    expect(event.y).toBe(20);
    expect(event.operations).toEqual([]);
  });

  it("throws when changing discriminator without a complete new variant", () => {
    const event = new Event(clickInitial);

    expect(() => event.setType("scroll")).toThrow();
    expect(event.type).toBe("click");
    expect(event.operations).toEqual([]);
  });

  it("replays operations via fromOperations", () => {
    const source = new Event(clickInitial);

    source.setX(15);
    source.setY(25);

    const operations = [...source.operations];
    const replayed = Event.fromOperations(clickInitial, operations);

    expect(replayed.x).toBe(15);
    expect(replayed.y).toBe(25);
    expect(replayed.operations).toEqual(operations);
  });
});

describe("SmartObject types", () => {
  it("infers getters, set*, operations, and fromOperations", () => {
    expectTypeOf<PersonInstance>().toHaveProperty("name");
    expectTypeOf<PersonInstance>().toHaveProperty("age");
    expectTypeOf<PersonInstance>().toHaveProperty("address");
    expectTypeOf<PersonInstance>().toHaveProperty("skills");

    expectTypeOf<PersonInstance["setName"]>().parameter(0).toEqualTypeOf<string>();
    expectTypeOf<PersonInstance["setAge"]>().parameter(0).toEqualTypeOf<number>();
    expectTypeOf<PersonInstance["setAddress"]>()
      .parameter(0)
      .toEqualTypeOf<{ street: string; city: string }>();
    expectTypeOf<PersonInstance["setSkills"]>()
      .parameter(0)
      .toEqualTypeOf<{ name: string; level: number }[]>();

    expectTypeOf<PersonInstance["operations"]>().toEqualTypeOf<readonly Operation[]>();
    expectTypeOf<PersonInstance["clearOperations"]>().toBeFunction();

    expectTypeOf<ConstructorParameters<typeof Person>[0]>().toEqualTypeOf<
      z.input<typeof personSchema> | undefined
    >();

    expectTypeOf(Person.fromOperations(initial, [])).toEqualTypeOf<PersonInstance>();
  });

  it("infers union field setters", () => {
    expectTypeOf<EntityInstance["setPayload"]>().parameter(0).toEqualTypeOf<string | number>();
    expectTypeOf<EntityInstance["setContact"]>()
      .parameter(0)
      .toEqualTypeOf<{ type: "email"; address: string } | { type: "phone"; number: string }>();
  });

  it("infers discriminated union root getters and setters", () => {
    expectTypeOf<EventInstance>().toHaveProperty("type");
    expectTypeOf<EventInstance>().toHaveProperty("x");
    expectTypeOf<EventInstance>().toHaveProperty("y");
    expectTypeOf<EventInstance>().toHaveProperty("delta");

    expectTypeOf<EventInstance["setType"]>().parameter(0).toEqualTypeOf<"click" | "scroll">();
    expectTypeOf<EventInstance["setX"]>().parameter(0).toEqualTypeOf<number>();
    expectTypeOf<EventInstance["setDelta"]>().parameter(0).toEqualTypeOf<number>();

    expectTypeOf<ConstructorParameters<typeof Event>[0]>().toEqualTypeOf<
      z.input<typeof eventSchema> | undefined
    >();

    expectTypeOf(Event.fromOperations(clickInitial, [])).toEqualTypeOf<EventInstance>();
  });
});
