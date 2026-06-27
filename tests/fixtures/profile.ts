import z from "zod";
import { SmartObject, type SmartObjectInstance } from "../../src/index.ts";

export const profileSchema = z.union([
  z.object({ name: z.string(), age: z.number() }),
  z.object({ name: z.string(), email: z.string() }),
]);

export const Profile = SmartObject(profileSchema);

export type ProfileInstance = SmartObjectInstance<typeof profileSchema>;

export const profileWithAgeInitial = { name: "Mario", age: 30 };
