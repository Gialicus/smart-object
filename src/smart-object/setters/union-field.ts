import { SmartObjectError } from "../../errors.js";
import type { ZodUnionRootLike } from "../../zod-introspect.js";
import type { InstanceState } from "../instance-state.js";
import { compare, deepClone } from "../json-patch.js";
import { assertKeyAllowedOnMatchingVariants, getMatchingVariantObjects } from "../union-variant.js";

export function createUnionFieldSetter<T>(
  state: InstanceState<T>,
  schema: ZodUnionRootLike,
  key: string,
) {
  return function (this: object, value: unknown) {
    const matchingVariants = getMatchingVariantObjects(state, this, schema);
    assertKeyAllowedOnMatchingVariants(matchingVariants, key);

    const data = state.getData(this);
    const beforeData = deepClone(data) as object;
    const candidate = { ...deepClone(data), [key]: value };

    let parsed: T;

    try {
      parsed = schema.parse(candidate) as T;
    } catch (cause) {
      throw SmartObjectError.invalidValue(key, cause);
    }

    const patch = compare(beforeData, parsed as object);

    if (patch.length === 0) {
      return;
    }

    state.setData(this, parsed);
    state.getOperations(this).push(...patch);
  };
}
