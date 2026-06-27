import { describe, expect, it } from "vitest";
import z from "zod";
import { SmartObject } from "../../src/index.ts";

describe("SmartObject record fields", () => {
  const schema = z.object({
    id: z.string(),
    tags: z.record(z.string(), z.string()),
  });

  const Doc = SmartObject(schema);
  const initial = { id: "doc-1", tags: { draft: "v1" } };

  it("reads record entries via get*Entry", () => {
    const doc = new Doc(initial);

    expect(doc.getTagsEntry("draft")).toBe("v1");
    expect(doc.getTagsEntry("missing")).toBeUndefined();
  });

  it("sets record entries and accumulates add/replace operations", () => {
    const doc = new Doc(initial);

    doc.setTagsEntry("draft", "v2");
    doc.setTagsEntry("published", "v1");

    expect(doc.tags).toEqual({ draft: "v2", published: "v1" });
    expect(doc.operations).toContainEqual({
      op: "replace",
      path: "/tags/draft",
      value: "v2",
    });
    expect(doc.operations).toContainEqual({
      op: "add",
      path: "/tags/published",
      value: "v1",
    });
  });

  it("escapes json pointer segments in record keys", () => {
    const doc = new Doc({ id: "doc-1", tags: {} });

    doc.setTagsEntry("a/b", "value");

    expect(doc.getTagsEntry("a/b")).toBe("value");
    expect(doc.operations).toContainEqual({
      op: "add",
      path: "/tags/a~1b",
      value: "value",
    });
  });

  it("deletes record entries", () => {
    const doc = new Doc(initial);

    doc.deleteTagsEntry("draft");

    expect(doc.tags).toEqual({});
    expect(doc.operations).toContainEqual({ op: "remove", path: "/tags/draft" });
  });

  it("does not accumulate operations for no-op record writes", () => {
    const doc = new Doc(initial);

    doc.setTagsEntry("draft", "v1");

    expect(doc.operations).toEqual([]);
  });

  it("replays record entry operations via fromOperations", () => {
    const source = new Doc(initial);

    source.setTagsEntry("draft", "v2");

    const replayed = Doc.fromOperations(initial, [...source.operations]);

    expect(replayed.tags).toEqual({ draft: "v2" });
  });
});
