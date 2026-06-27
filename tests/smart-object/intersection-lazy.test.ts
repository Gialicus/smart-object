import { describe, expect, it } from "vitest";
import z from "zod";
import { SmartObject } from "../../src/index.ts";

describe("SmartObject intersection and lazy roots", () => {
  it("supports z.intersection root schemas", () => {
    const schema = z.intersection(z.object({ id: z.string() }), z.object({ name: z.string() }));
    const User = SmartObject(schema);
    const initial = { id: "u-1", name: "Mario" };
    const user = new User(initial);

    user.setName("Luigi");

    expect(user.name).toBe("Luigi");
    expect(user.operations).toEqual([{ op: "replace", path: "/name", value: "Luigi" }]);
  });

  it("supports z.lazy root schemas", () => {
    interface Node {
      value: number;
      children: Node[];
    }

    const nodeSchema: z.ZodType<Node> = z.lazy(() =>
      z.object({
        value: z.number(),
        children: z.array(nodeSchema),
      }),
    );

    const NodeModel = SmartObject(nodeSchema);
    const initial: Node = {
      value: 1,
      children: [{ value: 2, children: [] }],
    };
    const node = new NodeModel(initial);

    node.setValue(10);

    expect(node.value).toBe(10);
    expect(node.operations).toEqual([{ op: "replace", path: "/value", value: 10 }]);
  });

  it("replays intersection root operations via fromOperations", () => {
    const schema = z.intersection(z.object({ id: z.string() }), z.object({ name: z.string() }));
    const User = SmartObject(schema);
    const initial = { id: "u-1", name: "Mario" };
    const source = new User(initial);

    source.setName("Luigi");

    const replayed = User.fromOperations(initial, [...source.operations]);

    expect(replayed.name).toBe("Luigi");
  });
});
