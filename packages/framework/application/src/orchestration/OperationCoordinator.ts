import type {
  Command,
  DispatchOptions,
  DispatchResult,
  ExecutionContext,
  Query,
  QueryOptions,
  QueryResult,
} from '@coreforge/contracts';
import { ExecutionContextManager } from '@coreforge/execution-context';

import { CommandOrchestrator } from './CommandOrchestrator';
import { QueryOrchestrator } from './QueryOrchestrator';
import { ApplicationDiagnostics } from '../diagnostics/ApplicationDiagnostics';
import { ApplicationCancellationError } from '../errors/ApplicationErrors';

export class OperationCoordinator {
  private readonly _commandOrchestrator: CommandOrchestrator;
  private readonly _queryOrchestrator: QueryOrchestrator;
  private readonly _contextManager: ExecutionContextManager;
  private readonly _diagnostics: ApplicationDiagnostics;

  constructor(
    commandOrchestrator: CommandOrchestrator,
    queryOrchestrator: QueryOrchestrator,
    contextManager: ExecutionContextManager,
    diagnostics: ApplicationDiagnostics,
  ) {
    this._commandOrchestrator = commandOrchestrator;
    this._queryOrchestrator = queryOrchestrator;
    this._contextManager = contextManager;
    this._diagnostics = diagnostics;
  }

  public async dispatchCommand<TPayload = unknown, TResult = unknown>(
    command: Command<TPayload>,
    options?: DispatchOptions,
  ): Promise<DispatchResult<TResult>> {
    const context = options?.context ?? this._contextManager.current();
    this._checkCancellation(context);

    this._diagnostics.recordNestedOperation();
    return this._commandOrchestrator.dispatch<TPayload, TResult>(command, {
      ...options,
      context,
    });
  }

  public async executeQuery<TPayload = unknown, TResult = unknown>(
    query: Query<TPayload>,
    options?: QueryOptions,
  ): Promise<QueryResult<TResult>> {
    const context = options?.context ?? this._contextManager.current();
    this._checkCancellation(context);

    this._diagnostics.recordNestedOperation();
    return this._queryOrchestrator.query<TPayload, TResult>(query, {
      ...options,
      context,
    });
  }

  public async executeSequential<T>(operations: Array<() => Promise<T>>): Promise<T[]> {
    const results: T[] = [];
    for (const op of operations) {
      this._checkCancellation(this._contextManager.current());
      const res = await op();
      results.push(res);
    }
    return results;
  }

  public async executeConcurrent<T>(operations: Array<() => Promise<T>>): Promise<T[]> {
    this._checkCancellation(this._contextManager.current());
    return Promise.all(
      operations.map(async (op) => {
        this._checkCancellation(this._contextManager.current());
        return op();
      }),
    );
  }

  private _checkCancellation(context?: ExecutionContext): void {
    if (context && context.signal.aborted) {
      throw new ApplicationCancellationError(
        'Operation aborted by execution context cancellation signal',
        { executionId: context.executionId },
      );
    }
  }
}
