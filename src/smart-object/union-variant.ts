import { SmartObjectError } from "../errors.js";
import {
  getDiscriminator,
  isZodDiscriminatedUnion,
  isZodObject,
  type ZodDiscriminatedUnionLike,
  type ZodObjectLike,
  type ZodUnionRootLike,
} from "../zod-introspect.js";
import type { InstanceState } from "./instance-state.js";

function getActiveVariantViaDiscriminator<T>(
  schema: ZodDiscriminatedUnionLike,
  data: T,
): ZodObjectLike | undefined {
  const discriminator = getDiscriminator(schema);
  const tag = (data as Record<string, unknown>)[discriminator];

  for (const option of schema.options) {
    if (!isZodObject(option)) {
      continue;
    }

    const tagSchema = option.shape[discriminator as keyof typeof option.shape];
    if (tagSchema?.safeParse(tag).success) {
      return option;
    }
  }

  return undefined;
}

export function getMatchingVariantObjects<T>(
  state: InstanceState<T>,
  instance: object,
  schema: ZodUnionRootLike,
): ZodObjectLike[] {
  const data = state.getData(instance);

  if (isZodDiscriminatedUnion(schema)) {
    const activeVariant = getActiveVariantViaDiscriminator(schema, data);
    return activeVariant ? [activeVariant] : [];
  }

  return schema.options.filter(isZodObject).filter((option) => option.safeParse(data).success);
}

export function assertKeyAllowedOnMatchingVariants(
  matchingVariants: ZodObjectLike[],
  key: string,
): void {
  if (matchingVariants.length === 0) {
    throw SmartObjectError.invalidUnionState();
  }

  if (matchingVariants.length === 1) {
    if (!(key in matchingVariants[0].shape)) {
      throw SmartObjectError.invalidUnionField(key);
    }
    return;
  }

  if (!matchingVariants.some((variant) => key in variant.shape)) {
    throw SmartObjectError.invalidUnionField(key);
  }
}
