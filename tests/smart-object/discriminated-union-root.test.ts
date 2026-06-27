import { describe, expect, it } from "vitest";
import { clickInitial, Event } from "../fixtures/event.ts";

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

  it("switches variant atomically via switchVariant", () => {
    const event = new Event(clickInitial);

    event.switchVariant({ type: "scroll", delta: 5 });

    expect(event.type).toBe("scroll");
    expect(event.delta).toBe(5);
    expect(event.operations).toEqual(
      expect.arrayContaining([
        { op: "remove", path: "/x" },
        { op: "remove", path: "/y" },
        { op: "replace", path: "/type", value: "scroll" },
        { op: "add", path: "/delta", value: 5 },
      ]),
    );
    expect(event.operations).toHaveLength(4);
  });

  it("switches variant via generated switchTo* method", () => {
    const event = new Event(clickInitial);

    event.switchToScroll({ delta: 8 });

    expect(event.type).toBe("scroll");
    expect(event.delta).toBe(8);
    expect(event.operations.length).toBeGreaterThan(0);
  });

  it("does not accumulate operations when switchVariant is a no-op", () => {
    const event = new Event({ type: "scroll", delta: 5 });

    event.switchVariant({ type: "scroll", delta: 5 });

    expect(event.operations).toEqual([]);
  });

  it("replays variant switch via fromOperations", () => {
    const source = new Event(clickInitial);

    source.switchToScroll({ delta: 5 });
    const operations = [...source.operations];
    const replayed = Event.fromOperations(clickInitial, operations);

    expect(replayed.type).toBe("scroll");
    expect(replayed.delta).toBe(5);
    expect(replayed.operations).toEqual(operations);
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
