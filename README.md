# @gialicus/smart-object

Typed TypeScript objects backed by Zod schemas, with an RFC 6902 operation log for every validated change. Use them when you need mutable, type-safe state plus a portable delta trail for audit, sync, or replay — without bolting on a separate change-tracking layer.

## Installation

```bash
npm install @gialicus/smart-object zod
```

Dependencies: [Zod](https://zod.dev) (peer dependency — schema validation) and [fast-json-patch](https://github.com/Starcounter-Jack/JSON-Patch) (RFC 6902 patch application, bundled).

## Usage

```typescript
import z from "zod";
import { SmartObject } from "@gialicus/smart-object";

const Person = SmartObject(z.object({
    name: z.string(),
    age: z.number(),
}));

const person = new Person({ name: "Mario", age: 30 });

// Reads expose validated state
console.log(person.name); // "Mario"

// Writes validate first, then append patches to person.operations
person.setName("Luigi");
person.setAge(31);

console.log(person.operations);
// [
//   { op: "replace", path: "/name", value: "Luigi" },
//   { op: "replace", path: "/age", value: 31 },
// ]

person.setName("Luigi"); // Unchanged value — no operation added (keeps sync payloads minimal)

person.clearOperations(); // Drops the audit trail after persist/sync; state is unchanged

// Snapshot for serialization — deep clone, safe for JSON.stringify
console.log(person.toJSON());

// Initial construction is the replay baseline — it never emits operations
console.log(new Person({ name: "Mario", age: 30 }).operations); // []

// Reconstruct from baseline + accumulated deltas
const initial = { name: "Mario", age: 30 };
const person2 = Person.fromOperations(initial, [...person.operations]);
```

### Union root schemas

`SmartObject` also accepts `z.discriminatedUnion(...)` and `z.union([...])` when every option is a `z.object(...)`:

```typescript
const Event = SmartObject(z.discriminatedUnion("type", [
    z.object({ type: z.literal("click"), x: z.number(), y: z.number() }),
    z.object({ type: z.literal("scroll"), delta: z.number() }),
]));

const event = new Event({ type: "click", x: 10, y: 20 });
event.setX(15);

// Switch the active union variant atomically
event.switchToScroll({ delta: 5 });
// or: event.switchVariant({ type: "scroll", delta: 5 });
```

See [`examples/event.ts`](examples/event.ts) and [`examples/profile.ts`](examples/profile.ts) for full demos.

Object and array getters always return deep clones — in-place mutation does not affect internal state or the operation log. Only `set*` methods generate RFC 6902 operations.

## API

### `SmartObject(schema)`

Factory that accepts a Zod schema and returns an instantiable class.

| Parameter | Type | Description |
|-----------|------|-------------|
| `schema` | `z.ZodObject` \| `z.ZodUnion` \| `z.ZodDiscriminatedUnion` \| `z.ZodIntersection` \| `z.ZodLazy` | Zod schema defining the object shape |

**Members generated for each schema field `foo`:**

| Member | Type | Description |
|--------|------|-------------|
| `foo` | getter | Exposes the current validated field value (deep clone for objects and arrays) |
| `setFoo(value)` | `(value: T) => void` | Validates, updates state, and records patches only when the value actually changes |

`set*` method names follow camelCase with the field name capitalized (`name` → `setName`, `userId` → `setUserId`).

**Union root extras** (discriminated and generic unions):

| Member | Type | Description |
|--------|------|-------------|
| `switchVariant(value)` | `(variant) => void` | Replaces the entire active variant after full schema validation |
| `switchTo{Variant}(fields)` | `(fields) => void` | Discriminated unions only — switches to a variant without repeating the discriminator (e.g. `switchToScroll({ delta: 5 })`) |

**Record field extras** (for each `z.record(...)` field `tags`):

| Member | Type | Description |
|--------|------|-------------|
| `getTagsEntry(key)` | `(key: string) => V \| undefined` | Reads a single record entry |
| `setTagsEntry(key, value)` | `(key: string, value: V) => void` | Validates and patches a single entry (`/tags/{key}`) |
| `deleteTagsEntry(key)` | `(key: string) => void` | Removes a record entry |

**Instance members:**

| Member | Type | Description |
|--------|------|-------------|
| `operations` | `readonly Operation[]` | Chronological RFC 6902 patch log (defensive copy) |
| `clearOperations()` | `() => void` | Clears the patch log without rolling back state |
| `toJSON()` | `() => T` | Deep clone of current state, safe for `JSON.stringify` |

**Static members:**

| Member | Type | Description |
|--------|------|-------------|
| `fromOperations(initial, operations)` | `(initial, Operation[]) => Instance` | Builds an instance from a baseline, replays and validates operations, and copies them into the accumulator |

### `SmartObjectError`

Structured error thrown on validation failures, invalid union field access, and failed replay:

| Property | Type | Description |
|----------|------|-------------|
| `code` | `"InvalidValue"` \| `"InvalidUnionField"` \| `"InvalidReplay"` \| `"UnsupportedSchema"` | Error category |
| `field` | `string` \| `undefined` | Schema field path when applicable |
| `cause` | `unknown` | Original error (e.g. `ZodError`) |

### `Operation`

RFC 6902 operation emitted by [fast-json-patch](https://github.com/Starcounter-Jack/JSON-Patch) when a field actually changes. Examples:

```typescript
{ op: "replace", path: "/name", value: "Luigi" }
{ op: "add", path: "/age", value: 30 }
```

### Exported types

- `Operation` — JSON Patch operation (re-export from `fast-json-patch`)
- `SetMethods<T>` — mapped type of inferred `set*` methods for shape `T`
- `SetMethodsUnion<T>` — `set*` methods for union root schemas
- `AllKeys<T>` — all keys across union members
- `UnionDataShape<U>` — flattened data shape for union roots
- `VariantSwitchMethods<T>` — `switchVariant` for union roots
- `DiscriminatedVariantSwitchMethods<T, D>` — `switchVariant` plus generated `switchTo*` methods
- `RecordFieldMethods<T>` — dynamic entry accessors for `z.record` fields
- `OperationsAccessor` — `operations` and `clearOperations()`
- `SnapshotAccessor<T>` — `toJSON()`
- `SmartObjectConstructor<T>` — constructor type including `fromOperations`
- `SmartObjectInstance<T>` — full instance type (getters + set* + operations + toJSON)

## Limitations

- **Partial discriminator write** — Changing a discriminated union discriminator alone via `setType(...)` without providing the new variant fields throws `SmartObjectError`. Use `switchVariant(...)` or `switchTo{Variant}(...)` instead.
- **Union field on wrong variant** — Setting a field that does not exist on the active variant throws `SmartObjectError`.
- **Date fields** — `z.date()` and `z.coerce.date()` are supported; operations store ISO 8601 strings while getters return `Date` instances. `Map`, `Set`, and other non-JSON types remain unsupported.
- **Transforms** — `z.transform` / `z.pipe` with different input and output types are not supported for replay-safe patching.

## Design rationale

1. **Construction** — `new Person(initial)` validates and seeds internal state without emitting operations, because that snapshot is the baseline every later patch is measured against.
2. **Validation** — Each write is validated against the schema so the operation log only records structurally valid changes.
3. **No-op writes** — Identical values are skipped to keep the patch log minimal and suitable for network sync.
4. **Patch-based updates** — Changes are expressed as RFC 6902 operations so deltas are standard, composable, and replayable.
5. **Operation accumulation** — Patches from `compare` are appended in order, preserving causality for audit and replay.
6. **Replay** — `fromOperations(initial, operations)` replays patches, re-validates with Zod, and requires the same baseline used when the operations were produced.

## Examples

- [`examples/person.ts`](examples/person.ts) — primitives, nested objects, and arrays
- [`examples/event.ts`](examples/event.ts) — discriminated union root
- [`examples/profile.ts`](examples/profile.ts) — generic union root

## Project structure

```
smart-object/
├── src/
│   ├── index.ts              # Public API barrel export
│   ├── types.ts              # Operation and inferred types
│   ├── errors.ts             # SmartObjectError
│   ├── zod-introspect.ts     # Zod schema introspection
│   └── smart-object/
│       ├── index.ts          # Re-export SmartObject
│       ├── factory.ts        # Public SmartObject() factory
│       ├── build-class.ts    # Class generation orchestration
│       ├── instance-state.ts # WeakMap-backed instance storage
│       ├── read-field.ts     # Defensive getter reads
│       ├── json-patch.ts     # fast-json-patch wrapper + Date-safe deepClone
│       ├── codecs.ts         # ISO 8601 serialization for date fields
│       ├── apply-operations.ts # Replay and rollback
│       ├── union-variant.ts  # Union variant matching
│       ├── define-prototype.ts # Getter/setter prototype setup
│       └── setters/
│           ├── object-field.ts
│           ├── union-field.ts
│           ├── variant-switch.ts
│           └── record-field.ts
├── examples/
│   ├── person.ts
│   ├── event.ts
│   └── profile.ts
├── tests/
│   ├── fixtures/
│   │   ├── person.ts
│   │   ├── entity.ts
│   │   ├── event.ts
│   │   └── profile.ts
│   ├── smart-object/
│   │   ├── construction.test.ts
│   │   ├── getters.test.ts
│   │   ├── setters.test.ts
│   │   ├── clear-operations.test.ts
│   │   ├── from-operations.test.ts
│   │   ├── union-fields.test.ts
│   │   ├── discriminated-union-root.test.ts
│   │   ├── generic-union-root.test.ts
│   │   ├── robustness.test.ts
│   │   ├── setter-naming.test.ts
│   │   ├── to-json.test.ts
│   │   ├── schema-variants.test.ts
│   │   ├── record-fields.test.ts
│   │   ├── date-codec.test.ts
│   │   ├── intersection-lazy.test.ts
│   │   └── types.test.ts
│   └── zod-introspect.test.ts
└── dist/                     # Build output (generated)
```
