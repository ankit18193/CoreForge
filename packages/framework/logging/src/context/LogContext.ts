export interface LogContextValues {
  readonly service?: string | undefined;
  readonly environment?: string | undefined;
  readonly correlationId?: string | undefined;
  readonly traceId?: string | undefined;
  readonly requestId?: string | undefined;
  readonly module?: string | undefined;
  readonly operation?: string | undefined;
  readonly [key: string]: unknown;
}
