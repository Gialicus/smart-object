import { describe, expectTypeOf, it } from "vitest";
import type z from "zod";
import type { Operation } from "../../src/index.ts";
import type { EntityInstance } from "../fixtures/entity.ts";
import type { EventInstance } from "../fixtures/event.ts";
import { clickInitial, Event, type eventSchema } from "../fixtures/event.ts";
import type { PersonInstance } from "../fixtures/person.ts";
import { Person, personInitial, type personSchema } from "../fixtures/person.ts";
import type { ProfileInstance } from "../fixtures/profile.ts";
import { Profile, type profileSchema, profileWithAgeInitial } from "../fixtures/profile.ts";

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

    expectTypeOf(Person.fromOperations(personInitial, [])).toEqualTypeOf<PersonInstance>();
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

  it("infers generic union root getters and setters", () => {
    expectTypeOf<ProfileInstance>().toHaveProperty("name");
    expectTypeOf<ProfileInstance>().toHaveProperty("age");
    expectTypeOf<ProfileInstance>().toHaveProperty("email");

    expectTypeOf<ProfileInstance["setName"]>().parameter(0).toEqualTypeOf<string>();
    expectTypeOf<ProfileInstance["setAge"]>().parameter(0).toEqualTypeOf<number>();
    expectTypeOf<ProfileInstance["setEmail"]>().parameter(0).toEqualTypeOf<string>();

    expectTypeOf<ConstructorParameters<typeof Profile>[0]>().toEqualTypeOf<
      z.input<typeof profileSchema> | undefined
    >();

    expectTypeOf(
      Profile.fromOperations(profileWithAgeInitial, []),
    ).toEqualTypeOf<ProfileInstance>();
  });

  it("infers toJSON on instance", () => {
    expectTypeOf<PersonInstance["toJSON"]>().toBeFunction();
    expectTypeOf<PersonInstance["toJSON"]>().returns.toEqualTypeOf<z.infer<typeof personSchema>>();
  });
});
