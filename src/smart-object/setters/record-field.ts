import type { z } from "zod";
import { SmartObjectError } from "../../errors.js";
import type { SmartObjectSchema } from "../../types.js";
import type { RecordFieldInfo } from "../../zod-introspect.js";
import { serializeDataForPatch, serializeEntryPatchValue } from "../codecs.js";
import type { InstanceState } from "../instance-state.js";
import { compare, deepClone } from "../json-patch.js";
import { readFieldValue } from "../read-field.js";

function getEntryContainer(
  data: Record<string, unknown>,
  fieldName: string,
  storage: "record" | "map",
): Map<string, unknown> | Record<string, unknown> {
  const container = data[fieldName];

  if (storage === "map") {
    return container instanceof Map
      ? (container as Map<string, unknown>)
      : new Map<string, unknown>();
  }

  if (typeof container === "object" && container !== null && !Array.isArray(container)) {
    return container as Record<string, unknown>;
  }

  return {};
}

function hasEntry(container: unknown, key: string, storage: "record" | "map"): boolean {
  if (storage === "map") {
    return container instanceof Map && container.has(key);
  }

  return typeof container === "object" && container !== null && Object.hasOwn(container, key);
}

function getEntry(container: unknown, key: string, storage: "record" | "map"): unknown {
  if (storage === "map" && container instanceof Map) {
    return container.get(key);
  }

  if (typeof container === "object" && container !== null) {
    return (container as Record<string, unknown>)[key];
  }

  return undefined;
}

function cloneContainer(
  container: unknown,
  storage: "record" | "map",
): Map<string, unknown> | Record<string, unknown> {
  if (storage === "map") {
    return deepClone(container instanceof Map ? container : new Map<string, unknown>());
  }

  return deepClone(
    typeof container === "object" && container !== null
      ? (container as Record<string, unknown>)
      : {},
  ) as Record<string, unknown>;
}

function setEntry(
  container: Map<string, unknown> | Record<string, unknown>,
  key: string,
  value: unknown,
  storage: "record" | "map",
): void {
  if (storage === "map" && container instanceof Map) {
    container.set(key, value);
    return;
  }

  (container as Record<string, unknown>)[key] = value;
}

function deleteEntry(
  container: Map<string, unknown> | Record<string, unknown>,
  key: string,
  storage: "record" | "map",
): void {
  if (storage === "map" && container instanceof Map) {
    container.delete(key);
    return;
  }

  delete (container as Record<string, unknown>)[key];
}

function normalizeEntryPatches(
  patch: ReturnType<typeof compare>,
  fieldName: string,
  fieldSchema: z.ZodType,
  valueSchema: z.ZodType,
  nextContainer: Map<string, unknown> | Record<string, unknown>,
  storage: "record" | "map",
) {
  const prefix = `/${fieldName}/`;

  return patch.map((operation) => {
    if (!("value" in operation) || !operation.path.startsWith(prefix)) {
      return operation;
    }

    const remainder = operation.path.slice(prefix.length);
    if (remainder.includes("/")) {
      return operation;
    }

    const entryKey = remainder.replace(/~1/g, "/").replace(/~0/g, "~");
    const entryValue =
      storage === "map" && nextContainer instanceof Map
        ? nextContainer.get(entryKey)
        : (nextContainer as Record<string, unknown>)[entryKey];

    return {
      ...operation,
      value: serializeEntryPatchValue(fieldSchema, valueSchema, entryValue),
    };
  });
}

export function createRecordEntryGetter<T>(state: InstanceState<T>, field: RecordFieldInfo) {
  return function (this: object, key: string) {
    const data = state.getData(this) as Record<string, unknown>;
    const value = getEntry(data[field.fieldName], key, field.storage);

    if (value === undefined) {
      return undefined;
    }

    return readFieldValue(value);
  };
}

export function createRecordEntrySetter<T>(
  state: InstanceState<T>,
  rootSchema: SmartObjectSchema,
  field: RecordFieldInfo,
) {
  const { fieldName, fieldSchema, valueSchema, storage } = field;

  return function (this: object, key: string, value: unknown) {
    let parsed: unknown;

    try {
      parsed = valueSchema.parse(value);
    } catch (cause) {
      throw SmartObjectError.invalidValue(`${fieldName}.${key}`, cause);
    }

    const data = state.getData(this) as Record<string, unknown>;
    const container = getEntryContainer(data, fieldName, storage);
    const previousValue = getEntry(container, key, storage);

    if (hasEntry(container, key, storage) && Object.is(previousValue, parsed)) {
      return;
    }

    const beforeData = deepClone(data) as Record<string, unknown>;
    const afterData = deepClone(data) as Record<string, unknown>;
    const nextContainer = cloneContainer(container, storage);
    setEntry(nextContainer, key, parsed, storage);
    afterData[fieldName] = nextContainer;

    const patch = normalizeEntryPatches(
      compare(
        serializeDataForPatch(beforeData, rootSchema),
        serializeDataForPatch(afterData, rootSchema),
      ),
      fieldName,
      fieldSchema,
      valueSchema,
      nextContainer,
      storage,
    );

    if (patch.length === 0) {
      return;
    }

    data[fieldName] = nextContainer;
    state.getOperations(this).push(...patch);
  };
}

export function createRecordEntryDeleter<T>(
  state: InstanceState<T>,
  rootSchema: SmartObjectSchema,
  field: RecordFieldInfo,
) {
  const { fieldName, storage } = field;

  return function (this: object, key: string) {
    const data = state.getData(this) as Record<string, unknown>;
    const container = data[fieldName];

    if (!hasEntry(container, key, storage)) {
      return;
    }

    const beforeData = deepClone(data) as Record<string, unknown>;
    const afterData = deepClone(data) as Record<string, unknown>;
    const nextContainer = cloneContainer(getEntryContainer(afterData, fieldName, storage), storage);
    deleteEntry(nextContainer, key, storage);
    afterData[fieldName] = nextContainer;

    const patch = compare(
      serializeDataForPatch(beforeData, rootSchema),
      serializeDataForPatch(afterData, rootSchema),
    );

    if (patch.length === 0) {
      return;
    }

    data[fieldName] = nextContainer;
    state.getOperations(this).push(...patch);
  };
}
