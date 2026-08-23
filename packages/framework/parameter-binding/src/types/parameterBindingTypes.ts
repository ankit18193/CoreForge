import {
  NormalizedRequest,
  ParameterBindingDescriptor,
  ParameterBindingResolver,
  ParameterBindingSource,
} from '@coreforge/contracts';

export type {
  NormalizedRequest,
  ParameterBindingDescriptor,
  ParameterBindingResolver,
  ParameterBindingSource,
};

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
