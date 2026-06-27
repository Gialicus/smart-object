import type { ZodError } from "zod";

export type SmartObjectErrorCode =
  | "InvalidValue"
  | "InvalidUnionField"
  | "InvalidReplay"
  | "UnsupportedSchema";

/**
 * Structured error for SmartObject operations — enables programmatic handling
 * without parsing generic Error messages.
 */
export class SmartObjectError extends Error {
  readonly code: SmartObjectErrorCode;
  readonly field?: string;
  readonly cause?: unknown;

  constructor(
    code: SmartObjectErrorCode,
    message: string,
    options?: { field?: string; cause?: unknown },
  ) {
    super(message);
    this.name = "SmartObjectError";
    this.code = code;
    this.field = options?.field;
    this.cause = options?.cause;
  }

  static invalidValue(field: string, cause: unknown): SmartObjectError {
    if (cause instanceof SmartObjectError) {
      return cause;
    }

    const message =
      cause instanceof Error && "issues" in cause
        ? `Invalid value for "${field}": ${(cause as ZodError).issues.map((i) => i.message).join(", ")}`
        : `Invalid value for "${field}"`;

    return new SmartObjectError("InvalidValue", message, { field, cause });
  }

  static invalidUnionField(field: string, message?: string): SmartObjectError {
    return new SmartObjectError(
      "InvalidUnionField",
      message ?? `Cannot set "${field}" on the active union variant`,
      { field },
    );
  }

  static invalidUnionState(): SmartObjectError {
    return new SmartObjectError("InvalidUnionField", "Cannot set field on invalid union state");
  }

  static invalidReplay(cause: unknown): SmartObjectError {
    const message =
      cause instanceof Error
        ? `Operation replay failed: ${cause.message}`
        : "Operation replay failed";

    return new SmartObjectError("InvalidReplay", message, { cause });
  }

  static unsupportedSchema(message: string): SmartObjectError {
    return new SmartObjectError("UnsupportedSchema", message);
  }
}
