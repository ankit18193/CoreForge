import {
  ApplicationDiagnosticsSnapshot,
  ApplicationManager as IApplicationManager,
  ApplicationResult,
  ApplicationService,
  ApplicationServiceOptions,
  ExecutionContext,
} from '@coreforge/contracts';
import { Dispatcher } from '@coreforge/dispatch';
import { ExecutionEngine } from '@coreforge/execution';
import { ExecutionContextManager } from '@coreforge/execution-context';
import { InterceptorEngine } from '@coreforge/interceptors';
import { QueryBus } from '@coreforge/query';

export type {
  ApplicationDiagnosticsSnapshot,
  ApplicationResult,
  ApplicationService,
  ApplicationServiceOptions,
  ExecutionContext,
  IApplicationManager,
};

export type ApplicationState = 'CREATED' | 'READY' | 'STOPPING' | 'STOPPED';

export interface ApplicationManagerOptions {
  readonly contextManager?: ExecutionContextManager | undefined;
  readonly executionEngine?: ExecutionEngine | undefined;
  readonly interceptorEngine?: InterceptorEngine | undefined;
  readonly dispatcher?: Dispatcher | undefined;
  readonly queryBus?: QueryBus | undefined;
  readonly autoStart?: boolean | undefined;
}
