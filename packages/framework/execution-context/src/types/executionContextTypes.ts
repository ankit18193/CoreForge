import {
  ExecutionContext as IExecutionContext,
  ExecutionContextManager as IExecutionContextManager,
  ExecutionContextOptions,
  ExecutionDiagnosticsSnapshot,
  ExecutionState,
} from '@coreforge/contracts';

export type {
  IExecutionContext,
  IExecutionContextManager,
  ExecutionContextOptions,
  ExecutionDiagnosticsSnapshot,
  ExecutionState,
};

export interface ExecutionMetadataConfig {
  readonly maxKeys?: number | undefined;
  readonly maxDepth?: number | undefined;
  readonly maxValueLength?: number | undefined;
}

export interface ExecutionContextConfig {
  readonly defaultMetadata?: Readonly<Record<string, unknown>> | undefined;
  readonly metadataLimits?: ExecutionMetadataConfig | undefined;
  readonly autoStart?: boolean | undefined;
}

export type ExecutionManagerState = 'CREATED' | 'READY' | 'STOPPING' | 'STOPPED';
