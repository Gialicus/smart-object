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

console.log("\nAfter mutations on click variant:");
console.log({ type: event.type, x: event.x, y: event.y, operations: event.operations });

event.setY(25);
console.log("\nNo-op write (unchanged value):");
console.log({ operations: event.operations });

event.switchToScroll({ delta: 5 });

console.log("\nAfter variant switch:");
console.log({ type: event.type, delta: event.delta, operations: event.operations });

event.clearOperations();
console.log("\nAfter clearOperations (state preserved, log empty):");
console.log({ type: event.type, delta: event.delta, operations: event.operations });

const replayedFields = Event.fromOperations(clickInitial, [
  { op: "replace", path: "/x", value: 15 },
  { op: "replace", path: "/y", value: 25 },
]);

console.log("\nReplayed field updates from baseline + operations:");
console.log({
  type: replayedFields.type,
  x: replayedFields.x,
  y: replayedFields.y,
  operations: replayedFields.operations,
});

const source = new Event(clickInitial);
source.switchToScroll({ delta: 5 });
const switchOperations = [...source.operations];

const replayedSwitch = Event.fromOperations(clickInitial, switchOperations);

console.log("\nReplayed variant switch from baseline + operations:");
console.log({
  type: replayedSwitch.type,
  delta: replayedSwitch.delta,
  operations: replayedSwitch.operations,
});
