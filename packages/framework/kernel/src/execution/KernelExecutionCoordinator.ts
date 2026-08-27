import { ApplicationManager } from '@coreforge/application';
import { Dispatcher } from '@coreforge/dispatch';
import { EventPublisher } from '@coreforge/events';
import { ExecutionEngine } from '@coreforge/execution';
import { ExecutionContextManager } from '@coreforge/execution-context';
import { QueryBus } from '@coreforge/query';

import { KernelDiagnostics } from '../diagnostics/KernelDiagnostics';
import { KernelErrorBoundary } from '../errors/KernelErrorBoundary';
import { KernelCancellationError } from '../errors/KernelErrors';
import { KernelProfiler } from '../internal/KernelProfiler';
import {
  ApplicationResult,
  ApplicationServiceOptions,
  Command,
  DispatchOptions,
  DispatchResult,
  ErrorHandlingEngine,
  Event,
  EventPublishOptions,
  EventPublishResult,
  ExecutionHandler,
  ExecutionOptions,
  ExecutionResult,
  Query,
  QueryOptions,
  QueryResult,
} from '../types/kernelTypes';

export class KernelExecutionCoordinator {
  public static async dispatch<TPayload = unknown, TResult = unknown>(
    command: Command<TPayload>,
    options: DispatchOptions | undefined,
    dispatcher: Dispatcher,
    contextManager: ExecutionContextManager,
    diagnostics: KernelDiagnostics,
    errorEngine?: ErrorHandlingEngine,
  ): Promise<DispatchResult<TResult>> {
    const profiler = new KernelProfiler().start();
    diagnostics.recordOperationStarted();

    const context =
      options?.context ?? contextManager.current() ?? contextManager.create({ autoStart: true });

    if (context.state === 'CREATED') {
      context.start();
    }

    try {
      if (context.signal.aborted) {
        throw new KernelCancellationError('Operation cancelled before dispatch');
      }

      const result = await contextManager.run(context, async () => {
        return dispatcher.dispatch<TPayload, TResult>(command, {
          ...options,
          context,
        });
      });

      if (result.state === 'CANCELLED') {
        diagnostics.recordOperationCancelled(profiler.elapsedMs);
      } else if (result.state === 'FAILED') {
        diagnostics.recordOperationFailed(profiler.elapsedMs);
        if (result.error) {
          await KernelErrorBoundary.handleError(result.error, context, errorEngine);
        }
      } else {
        diagnostics.recordOperationCompleted(profiler.elapsedMs);
      }

      return result;
    } catch (err) {
      if (context.signal.aborted) {
        diagnostics.recordOperationCancelled(profiler.elapsedMs);
      } else {
        diagnostics.recordOperationFailed(profiler.elapsedMs);
      }

      await KernelErrorBoundary.handleError(err, context, errorEngine);
      throw err;
    }
  }

  public static async query<TPayload = unknown, TResult = unknown>(
    query: Query<TPayload>,
    options: QueryOptions | undefined,
    queryBus: QueryBus,
    contextManager: ExecutionContextManager,
    diagnostics: KernelDiagnostics,
    errorEngine?: ErrorHandlingEngine,
  ): Promise<QueryResult<TResult>> {
    const profiler = new KernelProfiler().start();
    diagnostics.recordOperationStarted();

    const context =
      options?.context ?? contextManager.current() ?? contextManager.create({ autoStart: true });

    if (context.state === 'CREATED') {
      context.start();
    }

    try {
      if (context.signal.aborted) {
        throw new KernelCancellationError('Operation cancelled before query');
      }

      const result = await contextManager.run(context, async () => {
        return queryBus.query<TPayload, TResult>(query, {
          ...options,
          context,
        });
      });

      if (result.state === 'CANCELLED') {
        diagnostics.recordOperationCancelled(profiler.elapsedMs);
      } else if (result.state === 'FAILED') {
        diagnostics.recordOperationFailed(profiler.elapsedMs);
        if (result.error) {
          await KernelErrorBoundary.handleError(result.error, context, errorEngine);
        }
      } else {
        diagnostics.recordOperationCompleted(profiler.elapsedMs);
      }

      return result;
    } catch (err) {
      if (context.signal.aborted) {
        diagnostics.recordOperationCancelled(profiler.elapsedMs);
      } else {
        diagnostics.recordOperationFailed(profiler.elapsedMs);
      }

      await KernelErrorBoundary.handleError(err, context, errorEngine);
      throw err;
    }
  }

  public static async publish<TPayload = unknown>(
    event: Event<TPayload>,
    options: EventPublishOptions | undefined,
    eventPublisher: EventPublisher,
    contextManager: ExecutionContextManager,
    diagnostics: KernelDiagnostics,
    errorEngine?: ErrorHandlingEngine,
  ): Promise<EventPublishResult> {
    const profiler = new KernelProfiler().start();
    diagnostics.recordOperationStarted();

    const context =
      options?.context ?? contextManager.current() ?? contextManager.create({ autoStart: true });

    if (context.state === 'CREATED') {
      context.start();
    }

    try {
      if (context.signal.aborted) {
        throw new KernelCancellationError('Operation cancelled before event publication');
      }

      const result = await contextManager.run(context, async () => {
        return eventPublisher.publish<TPayload>(event, {
          ...options,
          context,
        });
      });

      if (result.state === 'CANCELLED') {
        diagnostics.recordOperationCancelled(profiler.elapsedMs);
      } else if (result.state === 'FAILED') {
        diagnostics.recordOperationFailed(profiler.elapsedMs);
      } else {
        diagnostics.recordOperationCompleted(profiler.elapsedMs);
      }

      return result;
    } catch (err) {
      if (context.signal.aborted) {
        diagnostics.recordOperationCancelled(profiler.elapsedMs);
      } else {
        diagnostics.recordOperationFailed(profiler.elapsedMs);
      }

      await KernelErrorBoundary.handleError(err, context, errorEngine);
      throw err;
    }
  }

  public static async executeService<TInput = unknown, TResult = unknown>(
    serviceName: string,
    input: TInput,
    options: ApplicationServiceOptions | undefined,
    applicationManager: ApplicationManager,
    contextManager: ExecutionContextManager,
    diagnostics: KernelDiagnostics,
    errorEngine?: ErrorHandlingEngine,
  ): Promise<ApplicationResult<TResult>> {
    const profiler = new KernelProfiler().start();
    diagnostics.recordOperationStarted();

    const context =
      options?.context ?? contextManager.current() ?? contextManager.create({ autoStart: true });

    if (context.state === 'CREATED') {
      context.start();
    }

    try {
      if (context.signal.aborted) {
        throw new KernelCancellationError('Operation cancelled before service execution');
      }

      const result = await contextManager.run(context, async () => {
        return applicationManager.execute<TInput, TResult>(serviceName, input, {
          ...options,
          context,
        });
      });

      if (result.state === 'CANCELLED') {
        diagnostics.recordOperationCancelled(profiler.elapsedMs);
      } else if (result.state === 'FAILED') {
        diagnostics.recordOperationFailed(profiler.elapsedMs);
        if (result.error) {
          await KernelErrorBoundary.handleError(result.error, context, errorEngine);
        }
      } else {
        diagnostics.recordOperationCompleted(profiler.elapsedMs);
      }

      return result;
    } catch (err) {
      if (context.signal.aborted) {
        diagnostics.recordOperationCancelled(profiler.elapsedMs);
      } else {
        diagnostics.recordOperationFailed(profiler.elapsedMs);
      }

      await KernelErrorBoundary.handleError(err, context, errorEngine);
      throw err;
    }
  }

  public static async execute<TInput = unknown, TOutput = unknown>(
    input: TInput,
    handler: ExecutionHandler<TInput, TOutput>,
    options: ExecutionOptions | undefined,
    executionEngine: ExecutionEngine,
    contextManager: ExecutionContextManager,
    diagnostics: KernelDiagnostics,
    errorEngine?: ErrorHandlingEngine,
  ): Promise<ExecutionResult<TOutput>> {
    const profiler = new KernelProfiler().start();
    diagnostics.recordOperationStarted();

    const context =
      options?.context ?? contextManager.current() ?? contextManager.create({ autoStart: true });

    if (context.state === 'CREATED') {
      context.start();
    }

    try {
      if (context.signal.aborted) {
        throw new KernelCancellationError('Operation cancelled before execution');
      }

      const result = await contextManager.run(context, async () => {
        return executionEngine.execute<TInput, TOutput>(input, handler, {
          ...options,
          context,
        });
      });

      if (result.state === 'CANCELLED') {
        diagnostics.recordOperationCancelled(profiler.elapsedMs);
      } else if (result.state === 'FAILED') {
        diagnostics.recordOperationFailed(profiler.elapsedMs);
        if (result.error) {
          await KernelErrorBoundary.handleError(result.error, context, errorEngine);
        }
      } else {
        diagnostics.recordOperationCompleted(profiler.elapsedMs);
      }

      return result;
    } catch (err) {
      if (context.signal.aborted) {
        diagnostics.recordOperationCancelled(profiler.elapsedMs);
      } else {
        diagnostics.recordOperationFailed(profiler.elapsedMs);
      }

      await KernelErrorBoundary.handleError(err, context, errorEngine);
      throw err;
    }
  }
}
