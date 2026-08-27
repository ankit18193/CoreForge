import { ApplicationManager } from '@coreforge/application';
import {
  ApplicationKernel as IApplicationKernel,
  ApplicationResult,
  ApplicationServiceOptions,
  Command,
  DispatchOptions,
  DispatchResult,
  ErrorHandlingEngine,
  Event,
  EventPublishOptions,
  EventPublishResult,
  ExecutionContext,
  ExecutionHandler,
  ExecutionOptions,
  ExecutionResult,
  KernelComponent,
  KernelComponentOptions,
  KernelDiagnosticsSnapshot,
  KernelOperationOptions,
  KernelStartOptions,
  KernelState,
  KernelStopOptions,
  Query,
  QueryOptions,
  QueryResult,
} from '@coreforge/contracts';
import { Dispatcher } from '@coreforge/dispatch';
import { EventPublisher } from '@coreforge/events';
import { ExecutionEngine } from '@coreforge/execution';
import { ExecutionContextManager } from '@coreforge/execution-context';
import { QueryBus } from '@coreforge/query';

export type {
  ApplicationResult,
  ApplicationServiceOptions,
  Command,
  DispatchOptions,
  DispatchResult,
  ErrorHandlingEngine,
  Event,
  EventPublishOptions,
  EventPublishResult,
  ExecutionContext,
  ExecutionHandler,
  ExecutionOptions,
  ExecutionResult,
  IApplicationKernel,
  KernelComponent,
  KernelComponentOptions,
  KernelDiagnosticsSnapshot,
  KernelOperationOptions,
  KernelStartOptions,
  KernelState,
  KernelStopOptions,
  Query,
  QueryOptions,
  QueryResult,
};

export interface RegisteredKernelComponentEntry {
  readonly id: string;
  readonly name: string;
  readonly component: KernelComponent;
  readonly dependencies: readonly string[];
  readonly sequence: number;
}

export interface ApplicationKernelConfig {
  readonly contextManager?: ExecutionContextManager | undefined;
  readonly executionEngine?: ExecutionEngine | undefined;
  readonly dispatcher?: Dispatcher | undefined;
  readonly queryBus?: QueryBus | undefined;
  readonly eventPublisher?: EventPublisher | undefined;
  readonly applicationManager?: ApplicationManager | undefined;
  readonly errorEngine?: ErrorHandlingEngine | undefined;
  readonly components?: readonly KernelComponent[] | undefined;
  readonly autoStart?: boolean | undefined;
  readonly gracefulShutdown?: boolean | undefined;
  readonly shutdownTimeoutMs?: number | undefined;
}
