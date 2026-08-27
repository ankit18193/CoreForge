import { ApplicationManager } from '@coreforge/application';
import {
  ApplicationIntegration as IApplicationIntegration,
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
  IntegrationDiagnosticsSnapshot,
  IntegrationState,
  Query,
  QueryOptions,
  QueryResult,
} from '@coreforge/contracts';
import { Dispatcher } from '@coreforge/dispatch';
import { EventPublisher } from '@coreforge/events';
import { ExecutionEngine } from '@coreforge/execution';
import { ExecutionContextManager } from '@coreforge/execution-context';
import { HookManager } from '@coreforge/hooks';
import { InterceptorEngine } from '@coreforge/interceptors';
import { ApplicationKernel } from '@coreforge/kernel';
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
  IApplicationIntegration,
  IntegrationDiagnosticsSnapshot,
  IntegrationState,
  Query,
  QueryOptions,
  QueryResult,
};

export interface ApplicationInfrastructureGraph {
  readonly contextManager: ExecutionContextManager;
  readonly executionEngine: ExecutionEngine;
  readonly interceptorEngine: InterceptorEngine;
  readonly dispatcher: Dispatcher;
  readonly queryBus: QueryBus;
  readonly eventPublisher: EventPublisher;
  readonly applicationManager: ApplicationManager;
  readonly errorEngine: ErrorHandlingEngine;
  readonly hookManager: HookManager;
  readonly kernel: ApplicationKernel;
}

export interface ApplicationIntegrationOptions {
  readonly contextManager?: ExecutionContextManager | undefined;
  readonly executionEngine?: ExecutionEngine | undefined;
  readonly interceptorEngine?: InterceptorEngine | undefined;
  readonly dispatcher?: Dispatcher | undefined;
  readonly queryBus?: QueryBus | undefined;
  readonly eventPublisher?: EventPublisher | undefined;
  readonly applicationManager?: ApplicationManager | undefined;
  readonly errorEngine?: ErrorHandlingEngine | undefined;
  readonly hookManager?: HookManager | undefined;
  readonly kernel?: ApplicationKernel | undefined;
  readonly autoStart?: boolean | undefined;
}
