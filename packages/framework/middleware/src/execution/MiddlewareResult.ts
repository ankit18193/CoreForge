export interface MiddlewareResult {
  readonly completed: boolean;
  readonly terminatedEarly: boolean;
  readonly exceptionThrown: boolean;
  readonly executedCount: number;
  readonly skippedCount: number;
  readonly duration: number;
}
