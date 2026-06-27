import { describe, expect, it } from "vitest";
import z from "zod";
import { SmartObject, SmartObjectError } from "../../src/index.ts";
import { Profile, profileWithAgeInitial } from "../fixtures/profile.ts";

describe("SmartObject generic union root", () => {
  it("populates getters for the active variant without operations", () => {
    const profile = new Profile(profileWithAgeInitial);

    expect(profile.name).toBe("Mario");
    expect(profile.age).toBe(30);
    expect(profile.operations).toEqual([]);
  });

  it("updates variant fields and accumulates replace operations", () => {
    const profile = new Profile(profileWithAgeInitial);

    profile.setAge(31);

    expect(profile.age).toBe(31);
    expect(profile.operations).toEqual([{ op: "replace", path: "/age", value: 31 }]);
  });

  it("throws when setting a field invalid for the active variant", () => {
    const profile = new Profile(profileWithAgeInitial);

    expect(() => profile.setEmail("mario@example.com")).toThrow();
    expect(profile.name).toBe("Mario");
    expect(profile.age).toBe(30);
    expect(profile.operations).toEqual([]);
  });

  it("replays operations via fromOperations", () => {
    const source = new Profile(profileWithAgeInitial);

    source.setAge(31);

    const operations = [...source.operations];
    const replayed = Profile.fromOperations(profileWithAgeInitial, operations);

    expect(replayed.age).toBe(31);
    expect(replayed.operations).toEqual(operations);
  });

  it("throws when union root options are not all z.object", () => {
    expect(() => SmartObject(z.union([z.string(), z.number()]))).toThrow(SmartObjectError);
  });
});
