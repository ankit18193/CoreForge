import {
  ValidationError,
  ValidationResult as IValidationResult,
  ValidationWarning,
} from '@coreforge/contracts';

export class ValidationResult implements IValidationResult {
  public readonly valid: boolean;
  public readonly errors: readonly ValidationError[];
  public readonly warnings: readonly ValidationWarning[];

  constructor(errors: readonly ValidationError[], warnings: readonly ValidationWarning[] = []) {
    this.errors = Object.freeze([...errors]);
    this.warnings = Object.freeze([...warnings]);
    this.valid = errors.length === 0;
    Object.freeze(this);
  }
}
