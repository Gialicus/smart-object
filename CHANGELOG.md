# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-06-27

### Breaking

- Getters for object and array fields always return deep clones; in-place mutation no longer affects internal state
- Removed `SmartObjectOptions` and the `immutableReads` factory option
- `operations` getter returns a defensive copy instead of the internal array reference

### Added

- `toJSON()` instance method for deep-cloned, JSON-safe snapshots (also used by `JSON.stringify`)
- `SmartObjectError` with structured `code`, optional `field`, and `cause` for programmatic error handling
- Zod schema introspection isolated in `src/zod-introspect.ts`
- CI matrix job testing Zod peer compatibility (`4.0.0` and `latest`)

### Changed

- Getter and setter methods are defined on the class prototype (one definition per schema, not per instance)
- Object field setters use a single `deepClone` per write instead of two
- `fromOperations` re-validates state with Zod after applying patches; invalid replay throws `SmartObjectError` and rolls back
- Setter and union validation errors throw `SmartObjectError` instead of generic `Error`
- Unsupported schema at factory time throws `SmartObjectError` with code `UnsupportedSchema`

## [1.0.0] - 2026-06-27

### Added

- `SmartObject(schema)` factory: typed getters and `set*` methods generated from a Zod object schema
- Support for `z.union([...])` and `z.discriminatedUnion(...)` at schema root
- RFC 6902 operation log (`operations`) for every validated change
- `clearOperations()` to reset the audit trail without rolling back state
- `fromOperations(initial, operations)` static method for deterministic replay
- Exported types: `Operation`, `SetMethods`, `SetMethodsUnion`, `AllKeys`, `UnionDataShape`, `OperationsAccessor`, `SmartObjectConstructor`, `SmartObjectInstance`

[2.0.0]: https://github.com/gialicus/smart-object/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/gialicus/smart-object/releases/tag/v1.0.0
