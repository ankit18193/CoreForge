import {
  TransportAdapter,
  TransportAdapterOptions,
  TransportCapability,
  TransportContext,
  TransportDiagnosticsSnapshot,
  TransportExecutionOptions,
  TransportManager as ITransportManager,
  TransportMetadata,
  TransportRequest,
  TransportResponse,
  TransportResult,
  TransportState,
} from '@coreforge/contracts';
import { ExecutionContextManager } from '@coreforge/execution-context';
import { ApplicationIntegration } from '@coreforge/integration';

export type {
  ITransportManager,
  TransportAdapter,
  TransportAdapterOptions,
  TransportCapability,
  TransportContext,
  TransportDiagnosticsSnapshot,
  TransportExecutionOptions,
  TransportMetadata,
  TransportRequest,
  TransportResponse,
  TransportResult,
  TransportState,
};

export interface RegisteredAdapterEntry<TRequest = unknown, TResponse = unknown> {
  readonly id: string;
  readonly name: string;
  readonly adapter: TransportAdapter<TRequest, TResponse>;
  readonly priority: number;
  readonly capabilities: readonly TransportCapability[];
  readonly sequence: number;
}

export interface TransportManagerOptions {
  readonly application?: ApplicationIntegration | undefined;
  readonly contextManager?: ExecutionContextManager | undefined;
  readonly autoStart?: boolean | undefined;
  readonly defaultTimeoutMs?: number | undefined;
}
