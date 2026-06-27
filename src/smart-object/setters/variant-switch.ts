import { SmartObjectError } from "../../errors.js";
import type {
  ZodDiscriminatedUnionLike,
  ZodObjectLike,
  ZodUnionRootLike,
} from "../../zod-introspect.js";
import type { InstanceState } from "../instance-state.js";
import { compare, deepClone } from "../json-patch.js";

function applyVariantSwitch<T>(
  state: InstanceState<T>,
  instance: object,
  schema: ZodUnionRootLike,
  value: unknown,
): void {
  const data = state.getData(instance);
  const beforeData = deepClone(data) as object;

  let parsed: T;

  try {
    parsed = schema.parse(value) as T;
  } catch (cause) {
    throw SmartObjectError.invalidValue("variant", cause);
  }

  const patch = compare(beforeData, parsed as object);

  if (patch.length === 0) {
    return;
  }

  state.setData(instance, parsed);
  state.getOperations(instance).push(...patch);
}

export function createSwitchVariant<T>(state: InstanceState<T>, schema: ZodUnionRootLike) {
  return function (this: object, value: unknown) {
    applyVariantSwitch(state, this, schema, value);
  };
}

export function createSwitchToVariant<T>(
  state: InstanceState<T>,
  schema: ZodDiscriminatedUnionLike,
  variantSchema: ZodObjectLike,
  tagValue: string | number | boolean,
  discriminator: string,
) {
  return function (this: object, partial: Record<string, unknown>) {
    const candidate = { ...partial, [discriminator]: tagValue };

    let parsed: T;

    try {
      parsed = variantSchema.parse(candidate) as T;
    } catch (cause) {
      throw SmartObjectError.invalidValue("variant", cause);
    }

    applyVariantSwitch(state, this, schema, parsed);
  };
}
