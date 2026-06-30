import z from "zod";
import { SmartObject } from "../dist/index.js";

const recordSchema = z.object({
  id: z.string(),
  tags: z.record(z.string(), z.string()),
});

const RecordDoc = SmartObject(recordSchema);

const recordInitial = { id: "doc-1", tags: { draft: "v1" } };

const doc = new RecordDoc(recordInitial);

console.log("Initial record field (no operations on construction):");
console.log({ id: doc.id, tags: doc.tags, operations: doc.operations });

doc.setTagsEntry("draft", "v2");
doc.setTagsEntry("published", "v1");

console.log("\nAfter entry mutations:");
console.log({
  draft: doc.getTagsEntry("draft"),
  published: doc.getTagsEntry("published"),
  operations: doc.operations,
});

doc.setTagsEntry("draft", "v2");
console.log("\nNo-op write (unchanged value):");
console.log({ operations: doc.operations });

doc.deleteTagsEntry("draft");
console.log("\nAfter deleteTagsEntry:");
console.log({ tags: doc.tags, operations: doc.operations });

const mapSchema = z.object({
  id: z.string(),
  tags: z.map(z.string(), z.number()),
});

const MapDoc = SmartObject(mapSchema);

const mapInitial = { id: "doc-2", tags: new Map([["draft", 1]]) };

const mapDoc = new MapDoc(mapInitial);

mapDoc.setTagsEntry("draft", 2);
mapDoc.setTagsEntry("published", 3);

console.log("\nString-key z.map entry API:");
console.log({
  draft: mapDoc.getTagsEntry("draft"),
  published: mapDoc.getTagsEntry("published"),
  operations: mapDoc.operations,
});

const replayed = RecordDoc.fromOperations(recordInitial, [
  { op: "replace", path: "/tags/draft", value: "v2" },
  { op: "add", path: "/tags/published", value: "v1" },
  { op: "remove", path: "/tags/draft" },
]);

console.log("\nReplayed record entry operations:");
console.log({ tags: replayed.tags, operations: replayed.operations });
