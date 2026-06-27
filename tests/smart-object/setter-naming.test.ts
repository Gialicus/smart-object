import { describe, expect, it } from "vitest";
import z from "zod";
import { SmartObject } from "../../src/index.ts";

describe("SmartObject setter naming", () => {
  const userSchema = z.object({
    userId: z.string(),
    firstName: z.string(),
  });

  const User = SmartObject(userSchema);

  it("capitalizes camelCase keys for set* method names", () => {
    const user = new User({ userId: "u-1", firstName: "Mario" });

    user.setUserId("u-2");
    user.setFirstName("Luigi");

    expect(user.userId).toBe("u-2");
    expect(user.firstName).toBe("Luigi");
    expect(user.operations).toEqual([
      { op: "replace", path: "/userId", value: "u-2" },
      { op: "replace", path: "/firstName", value: "Luigi" },
    ]);
  });
});
