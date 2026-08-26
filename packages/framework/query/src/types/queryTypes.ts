import {
  ExecutionContext,
  Query,
  QueryBus as IQueryBus,
  QueryDiagnosticsSnapshot,
  QueryHandler,
  QueryOptions,
  QueryResult,
} from '@coreforge/contracts';
import { ExecutionEngine } from '@coreforge/execution';
import { ExecutionContextManager } from '@coreforge/execution-context';
import { InterceptorEngine } from '@coreforge/interceptors';

export type {
  ExecutionContext,
  IQueryBus,
  Query,
  QueryDiagnosticsSnapshot,
  QueryHandler,
  QueryOptions,
  QueryResult,
};

export type QueryState = 'CREATED' | 'READY' | 'STOPPING' | 'STOPPED';

export interface QueryBusOptions {
  readonly contextManager?: ExecutionContextManager | undefined;
  readonly executionEngine?: ExecutionEngine | undefined;
  readonly interceptorEngine?: InterceptorEngine | undefined;
  readonly autoStart?: boolean | undefined;
}
