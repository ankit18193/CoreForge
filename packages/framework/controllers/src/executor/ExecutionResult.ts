export interface ExecutionResult {
  readonly success: boolean;
  readonly returnedValue: unknown;
  readonly duration: number;
  readonly exception: unknown | null;
}
