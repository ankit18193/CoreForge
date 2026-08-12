import { ValidationError, ValidationWarning } from '@coreforge/contracts';

import { ValidationResult } from './ValidationResult';

export class ValidationErrorCollection {
  private readonly _errors: ValidationError[] = [];
  private readonly _warnings: ValidationWarning[] = [];

  public addError(path: string, message: string, ruleName: string): void {
    this._errors.push({ path, message, ruleName });
  }

  public addWarning(path: string, message: string): void {
    this._warnings.push({ path, message });
  }

  public get hasErrors(): boolean {
    return this._errors.length > 0;
  }

  public toResult(): ValidationResult {
    return new ValidationResult(this._errors, this._warnings);
  }
}
