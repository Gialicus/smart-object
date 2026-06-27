import z from "zod";
import { SmartObject, type SmartObjectInstance } from "../../src/index.ts";

export const eventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("click"), x: z.number(), y: z.number() }),
  z.object({ type: z.literal("scroll"), delta: z.number() }),
]);

export const Event = SmartObject(eventSchema);

export type EventInstance = SmartObjectInstance<typeof eventSchema>;

export const clickInitial = { type: "click" as const, x: 10, y: 20 };
