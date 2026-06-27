import z from "zod";
import { SmartObject } from "../dist/index.js";

const eventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("click"), x: z.number(), y: z.number() }),
  z.object({ type: z.literal("scroll"), delta: z.number() }),
]);

const Event = SmartObject(eventSchema);

const clickInitial = { type: "click" as const, x: 10, y: 20 };

const event = new Event(clickInitial);

console.log("Initial click event (no operations on construction):");
console.log({ type: event.type, x: event.x, y: event.y, operations: event.operations });

event.setX(15);
event.setY(25);

event.switchToScroll({ delta: 5 });

console.log("\nAfter variant switch:");
console.log({ type: event.type, delta: event.delta, operations: event.operations });

event.setX(15);
console.log("\nNo-op write (unchanged value):");
console.log({ operations: event.operations });

event.clearOperations();
console.log("\nAfter clearOperations (state preserved, log empty):");
console.log({ x: event.x, y: event.y, operations: event.operations });

const replayed = Event.fromOperations(clickInitial, [
  { op: "replace", path: "/x", value: 15 },
  { op: "replace", path: "/y", value: 25 },
]);

console.log("\nReplayed from baseline + operations:");
console.log({ x: replayed.x, y: replayed.y, operations: replayed.operations });
