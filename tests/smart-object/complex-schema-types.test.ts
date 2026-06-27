import { describe, expect, it } from "vitest";
import z from "zod";
import { SmartObject } from "../../src/index.ts";

describe("SmartObject complex schema types", () => {
  it("preserves Map in getter and produces JSON-safe operations", () => {
    const schema = z.object({
      tags: z.map(z.string(), z.number()),
    });
    const Model = SmartObject(schema);
    const instance = new Model({ tags: new Map([["draft", 1]]) });

    expect(instance.tags).toBeInstanceOf(Map);
    expect(instance.tags.get("draft")).toBe(1);

    instance.setTags(
      new Map([
        ["draft", 2],
        ["published", 3],
      ]),
    );

    expect(instance.tags.get("draft")).toBe(2);
    expect(instance.tags.get("published")).toBe(3);
    expect(() => JSON.stringify(instance.operations)).not.toThrow();
    expect(instance.operations).toEqual([
      {
        op: "replace",
        path: "/tags",
        value: { draft: 2, published: 3 },
      },
    ]);

    const replayed = Model.fromOperations({ tags: new Map([["draft", 1]]) }, [
      ...instance.operations,
    ]);
    expect(replayed.tags).toBeInstanceOf(Map);
    expect(replayed.tags.get("published")).toBe(3);
  });

  it("supports map entry API for string-key maps", () => {
    const schema = z.object({
      tags: z.map(z.string(), z.number()),
    });
    const Model = SmartObject(schema);
    const instance = new Model({ tags: new Map([["draft", 1]]) });

    instance.setTagsEntry("draft", 2);
    instance.setTagsEntry("published", 3);

    expect(instance.getTagsEntry("draft")).toBe(2);
    expect(instance.tags.get("published")).toBe(3);

    instance.deleteTagsEntry("draft");
    expect(instance.getTagsEntry("draft")).toBeUndefined();
    expect(instance.tags.has("draft")).toBe(false);
  });

  it("preserves Set in getter and produces JSON-safe operations", () => {
    const schema = z.object({
      ids: z.set(z.string()),
    });
    const Model = SmartObject(schema);
    const instance = new Model({ ids: new Set(["a"]) });

    expect(instance.ids).toBeInstanceOf(Set);
    expect(instance.ids.has("a")).toBe(true);

    instance.setIds(new Set(["b", "c"]));

    expect(instance.ids.has("b")).toBe(true);
    expect(instance.ids.has("c")).toBe(true);
    expect(() => JSON.stringify(instance.operations)).not.toThrow();
    expect(instance.operations.length).toBeGreaterThan(0);

    const replayed = Model.fromOperations({ ids: new Set(["a"]) }, [...instance.operations]);
    expect(replayed.ids).toBeInstanceOf(Set);
    expect(replayed.ids.has("b")).toBe(true);
  });

  it("serializes bigint as string in operations and replays correctly", () => {
    const schema = z.object({
      id: z.bigint(),
    });
    const Model = SmartObject(schema);
    const instance = new Model({ id: 1n });

    instance.setId(42n);

    expect(instance.id).toBe(42n);
    expect(instance.operations).toEqual([{ op: "replace", path: "/id", value: "42" }]);
    expect(() => JSON.stringify(instance.operations)).not.toThrow();

    const replayed = Model.fromOperations({ id: 1n }, [...instance.operations]);
    expect(replayed.id).toBe(42n);
  });

  it("supports z.coerce.bigint fields", () => {
    const schema = z.object({
      id: z.coerce.bigint(),
    });
    const Model = SmartObject(schema);
    const instance = new Model({ id: 1n });

    instance.setId(99n);

    expect(instance.operations[0]).toEqual({ op: "replace", path: "/id", value: "99" });
  });

  it("serializes nested dates inside record object values", () => {
    const schema = z.object({
      meta: z.record(z.string(), z.object({ at: z.date() })),
    });
    const Model = SmartObject(schema);
    const initial = { meta: { a: { at: new Date("2026-01-01T00:00:00.000Z") } } };
    const instance = new Model(initial);
    const nextDate = new Date("2026-02-01T00:00:00.000Z");

    instance.setMetaEntry("a", { at: nextDate });

    expect(instance.getMetaEntry("a")?.at).toEqual(nextDate);
    expect(instance.operations).toEqual([
      {
        op: "replace",
        path: "/meta/a/at",
        value: "2026-02-01T00:00:00.000Z",
      },
    ]);

    const replayed = Model.fromOperations(initial, [...instance.operations]);
    expect(replayed.getMetaEntry("a")?.at).toEqual(nextDate);
  });

  it("generates entry API for lazy-wrapped record fields", () => {
    const schema = z.object({
      tags: z.lazy(() => z.record(z.string(), z.string())),
    });
    const Model = SmartObject(schema);
    const instance = new Model({ tags: { draft: "v1" } });

    instance.setTagsEntry("draft", "v2");

    expect(instance.getTagsEntry("draft")).toBe("v2");
    expect(instance.operations).toEqual([{ op: "replace", path: "/tags/draft", value: "v2" }]);
  });

  it("generates entry API for preprocess-wrapped record fields", () => {
    const schema = z.object({
      tags: z.preprocess((value) => value, z.record(z.string(), z.number())),
    });
    const Model = SmartObject(schema);
    const instance = new Model({ tags: { count: 1 } });

    instance.setTagsEntry("count", 2);

    expect(instance.getTagsEntry("count")).toBe(2);
    expect(instance.operations).toEqual([{ op: "replace", path: "/tags/count", value: 2 }]);
  });

  it("supports nested intersection and lazy object fields", () => {
    interface Node {
      value: number;
      children: Node[];
    }

    const nodeSchema: z.ZodType<Node> = z.lazy(() =>
      z.object({
        value: z.number(),
        children: z.array(nodeSchema),
      }),
    );

    const schema = z.object({
      id: z.string(),
      node: nodeSchema,
      profile: z.intersection(z.object({ age: z.number() }), z.object({ city: z.string() })),
    });
    const Model = SmartObject(schema);
    const instance = new Model({
      id: "n-1",
      node: { value: 1, children: [] },
      profile: { age: 30, city: "Milano" },
    });

    instance.setNode({ value: 2, children: [{ value: 3, children: [] }] });
    instance.setProfile({ age: 31, city: "Roma" });

    expect(instance.node.value).toBe(2);
    expect(instance.profile.city).toBe("Roma");
    expect(instance.operations.length).toBeGreaterThan(0);
  });
});
