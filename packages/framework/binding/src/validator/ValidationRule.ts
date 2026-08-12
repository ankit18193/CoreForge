export interface ValidationRule {
  readonly ruleName: string;
  validate(
    value: unknown,
    path: string,
  ): {
    valid: boolean;
    message?: string | undefined;
    isWarning?: boolean | undefined;
  };
}
