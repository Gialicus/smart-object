import { describe, expect, it } from "vitest";
import z from "zod";
import { SmartObject } from "../../src/index.ts";

describe("SmartObject date codec", () => {
  const schema = z.object({
    title: z.string(),
    dueAt: z.coerce.date(),
  });

  const Task = SmartObject(schema);
  const dueDate = new Date("2026-07-01T00:00:00.000Z");
  const initial = { title: "Review", dueAt: dueDate };

  it("stores Date internally and serializes ISO strings in operations", () => {
    const task = new Task(initial);
    const nextDue = new Date("2026-08-01T00:00:00.000Z");

    task.setDueAt(nextDue);

    expect(task.dueAt).toEqual(nextDue);
    expect(task.operations).toEqual([
      {
        op: "replace",
        path: "/dueAt",
        value: "2026-08-01T00:00:00.000Z",
      },
    ]);
  });

  it("replays date operations via fromOperations", () => {
    const source = new Task(initial);
    const nextDue = new Date("2026-08-01T00:00:00.000Z");

    source.setDueAt(nextDue);
    const replayed = Task.fromOperations(initial, [...source.operations]);

    expect(replayed.dueAt).toEqual(nextDue);
    expect(replayed.operations).toEqual(source.operations);
  });

  it("supports z.date fields", () => {
    const strictSchema = z.object({
      createdAt: z.date(),
    });
    const Model = SmartObject(strictSchema);
    const createdAt = new Date("2026-01-01T00:00:00.000Z");
    const instance = new Model({ createdAt });

    instance.setCreatedAt(new Date("2026-02-01T00:00:00.000Z"));

    expect(instance.operations[0]).toEqual({
      op: "replace",
      path: "/createdAt",
      value: "2026-02-01T00:00:00.000Z",
    });
  });
});
