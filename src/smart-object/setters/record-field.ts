import { SmartObjectError } from "../../errors.js";
import type { InstanceState } from "../instance-state.js";
import { compare, deepClone } from "../json-patch.js";

export function createRecordEntryGetter<T>(state: InstanceState<T>, fieldName: string) {
  return function (this: object, key: string) {
    const record = (state.getData(this) as Record<string, unknown>)[fieldName];

    if (typeof record !== "object" || record === null) {
      return undefined;
    }

    return (record as Record<string, unknown>)[key];
  };
}

export function createRecordEntrySetter<T>(
  state: InstanceState<T>,
  fieldName: string,
  valueSchema: { parse: (value: unknown) => unknown },
) {
  return function (this: object, key: string, value: unknown) {
    let parsed: unknown;

    try {
      parsed = valueSchema.parse(value);
    } catch (cause) {
      throw SmartObjectError.invalidValue(`${fieldName}.${key}`, cause);
    }

    const data = state.getData(this) as Record<string, unknown>;
    const beforeData = deepClone(data) as object;
    const record = deepClone(data[fieldName]) as Record<string, unknown> | undefined;
    const nextRecord = typeof record === "object" && record !== null ? record : {};
    const hadKey = Object.hasOwn(nextRecord, key);
    const previousValue = nextRecord[key];

    if (hadKey && Object.is(previousValue, parsed)) {
      return;
    }

    nextRecord[key] = parsed;

    const afterData = deepClone(data) as Record<string, unknown>;
    afterData[fieldName] = nextRecord;

    const patch = compare(beforeData, afterData as object);

    if (patch.length === 0) {
      return;
    }

    if (typeof data[fieldName] !== "object" || data[fieldName] === null) {
      data[fieldName] = {};
    }

    (data[fieldName] as Record<string, unknown>)[key] = parsed;
    state.getOperations(this).push(...patch);
  };
}

export function createRecordEntryDeleter<T>(state: InstanceState<T>, fieldName: string) {
  return function (this: object, key: string) {
    const data = state.getData(this) as Record<string, unknown>;
    const record = data[fieldName];

    if (typeof record !== "object" || record === null || !Object.hasOwn(record, key)) {
      return;
    }

    const beforeData = deepClone(data) as object;
    delete (record as Record<string, unknown>)[key];
    const patch = compare(beforeData, deepClone(data) as object);

    if (patch.length === 0) {
      return;
    }

    state.getOperations(this).push(...patch);
  };
}
