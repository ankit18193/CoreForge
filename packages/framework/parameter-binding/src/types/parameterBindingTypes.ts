import {
  ParameterBindingDescriptor,
  ParameterBindingResolver,
  ParameterBindingSource,
} from '@coreforge/contracts';

export type { ParameterBindingDescriptor, ParameterBindingResolver, ParameterBindingSource };

export interface NormalizedRequest {
  readonly params?: Readonly<Record<string, unknown>> | undefined;
  readonly query?: Readonly<Record<string, unknown>> | undefined;
  readonly body?: unknown | undefined;
  readonly headers?: Readonly<Record<string, string | string[] | undefined>> | undefined;
  readonly cookies?: Readonly<Record<string, string | undefined>> | undefined;
}

export interface ParameterBindingDiagnosticsSnapshot {
  readonly totalBindings: number;
  readonly successfulBindings: number;
  readonly failedBindings: number;
  readonly missingRequiredValues: number;
  readonly sourceFailures: number;
  readonly totalDurationMs: number;
  readonly averageDurationMs: number;
  readonly timestamp: number;
}
