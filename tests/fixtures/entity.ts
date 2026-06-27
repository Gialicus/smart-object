import z from "zod";
import { SmartObject, type SmartObjectInstance } from "../../src/index.ts";

export const entitySchema = z.object({
  id: z.string(),
  payload: z.union([z.string(), z.number()]),
  contact: z.discriminatedUnion("type", [
    z.object({ type: z.literal("email"), address: z.string() }),
    z.object({ type: z.literal("phone"), number: z.string() }),
  ]),
});

export const Entity = SmartObject(entitySchema);

export type EntityInstance = SmartObjectInstance<typeof entitySchema>;

export const entityInitial = {
  id: "e-1",
  payload: "hello",
  contact: { type: "email" as const, address: "mario@example.com" },
};
