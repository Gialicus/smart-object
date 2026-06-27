import z from "zod";
import { SmartObject, type SmartObjectInstance } from "../../src/index.ts";

export const personSchema = z.object({
  name: z.string(),
  age: z.number(),
  address: z.object({
    street: z.string(),
    city: z.string(),
  }),
  skills: z.array(
    z.object({
      name: z.string(),
      level: z.number(),
    }),
  ),
});

export const Person = SmartObject(personSchema);

export type PersonInstance = SmartObjectInstance<typeof personSchema>;

export const personInitial = {
  name: "Mario",
  age: 30,
  address: { street: "Via Roma 1", city: "Milano" },
  skills: [
    { name: "Programming", level: 10 },
    { name: "Design", level: 8 },
  ],
};
