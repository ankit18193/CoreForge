export interface ConfigurationValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly validatedValues: Readonly<Record<string, unknown>>;
}
