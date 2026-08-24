export interface BulkheadWaiter {
  readonly resolve: () => void;
  readonly reject: (err: Error) => void;
  signal?: AbortSignal | undefined;
  abortHandler?: (() => void) | undefined;
}
