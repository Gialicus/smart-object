import z from "zod";
import { SmartObject } from "../dist/index.js";

const profileSchema = z.union([
  z.object({ name: z.string(), age: z.number() }),
  z.object({ name: z.string(), email: z.string() }),
]);

const Profile = SmartObject(profileSchema);

const initial = { name: "Mario", age: 30 };

const profile = new Profile(initial);

console.log("Initial profile (no operations on construction):");
console.log({ name: profile.name, age: profile.age, operations: profile.operations });

profile.setAge(31);

console.log("\nAfter mutation:");
console.log({ name: profile.name, age: profile.age, operations: profile.operations });

profile.setAge(31);
console.log("\nNo-op write (unchanged value):");
console.log({ operations: profile.operations });

profile.clearOperations();
console.log("\nAfter clearOperations (state preserved, log empty):");
console.log({ name: profile.name, age: profile.age, operations: profile.operations });

const replayed = Profile.fromOperations(initial, [{ op: "replace", path: "/age", value: 31 }]);

console.log("\nReplayed from baseline + operations:");
console.log({ name: replayed.name, age: replayed.age, operations: replayed.operations });
