import { ApplicationKernel } from '@coreforge/kernel';

import { IntegrationDiagnostics } from '../diagnostics/IntegrationDiagnostics';
import { IntegrationProfiler } from '../internal/IntegrationProfiler';
import {
  ApplicationResult,
  ApplicationServiceOptions,
  Command,
  DispatchOptions,
  DispatchResult,
  Event,
  EventPublishOptions,
  EventPublishResult,
  ExecutionHandler,
  ExecutionOptions,
  ExecutionResult,
  Query,
  QueryOptions,
  QueryResult,
} from '../types/integrationTypes';

export class IntegrationExecutionCoordinator {
  public static async dispatch<TPayload = unknown, TResult = unknown>(
    kernel: ApplicationKernel,
    command: Command<TPayload>,
    diagnostics: IntegrationDiagnostics,
    options?: DispatchOptions,
  ): Promise<DispatchResult<TResult>> {
    const profiler = new IntegrationProfiler().start();
    diagnostics.recordOperationStarted('dispatch');

    try {
      const result = await kernel.dispatch<TPayload, TResult>(command, options);
      const durationMs = profiler.elapsedMs;

      if (result.success) {
        diagnostics.recordOperationCompleted(durationMs);
      } else {
        diagnostics.recordOperationFailed(durationMs);
      }

      return result;
    } catch (err) {
      const durationMs = profiler.elapsedMs;
      diagnostics.recordOperationFailed(durationMs);
      throw err;
    }
  }

  public static async query<TPayload = unknown, TResult = unknown>(
    kernel: ApplicationKernel,
    query: Query<TPayload>,
    diagnostics: IntegrationDiagnostics,
    options?: QueryOptions,
  ): Promise<QueryResult<TResult>> {
    const profiler = new IntegrationProfiler().start();
    diagnostics.recordOperationStarted('query');

    try {
      const result = await kernel.query<TPayload, TResult>(query, options);
      const durationMs = profiler.elapsedMs;

      if (result.success) {
        diagnostics.recordOperationCompleted(durationMs);
      } else {
        diagnostics.recordOperationFailed(durationMs);
      }

      return result;
    } catch (err) {
      const durationMs = profiler.elapsedMs;
      diagnostics.recordOperationFailed(durationMs);
      throw err;
    }
  }

  public static async publish<TPayload = unknown>(
    kernel: ApplicationKernel,
    event: Event<TPayload>,
    diagnostics: IntegrationDiagnostics,
    options?: EventPublishOptions,
  ): Promise<EventPublishResult> {
    const profiler = new IntegrationProfiler().start();
    diagnostics.recordOperationStarted('event');

    try {
      const result = await kernel.publish<TPayload>(event, options);
      const durationMs = profiler.elapsedMs;

      if (result.success) {
        diagnostics.recordOperationCompleted(durationMs);
      } else {
        diagnostics.recordOperationFailed(durationMs);
      }

      return result;
    } catch (err) {
      const durationMs = profiler.elapsedMs;
      diagnostics.recordOperationFailed(durationMs);
      throw err;
    }
  }

  public static async executeService<TInput = unknown, TResult = unknown>(
    kernel: ApplicationKernel,
    serviceName: string,
    input: TInput,
    diagnostics: IntegrationDiagnostics,
    options?: ApplicationServiceOptions,
  ): Promise<ApplicationResult<TResult>> {
    const profiler = new IntegrationProfiler().start();
    diagnostics.recordOperationStarted('service');

    try {
      const result = await kernel.executeService<TInput, TResult>(serviceName, input, options);
      const durationMs = profiler.elapsedMs;

      if (result.success) {
        diagnostics.recordOperationCompleted(durationMs);
      } else {
        diagnostics.recordOperationFailed(durationMs);
      }

      return result;
    } catch (err) {
      const durationMs = profiler.elapsedMs;
      diagnostics.recordOperationFailed(durationMs);
      throw err;
    }
  }

  public static async execute<TInput = unknown, TOutput = unknown>(
    kernel: ApplicationKernel,
    input: TInput,
    handler: ExecutionHandler<TInput, TOutput>,
    diagnostics: IntegrationDiagnostics,
    options?: ExecutionOptions,
  ): Promise<ExecutionResult<TOutput>> {
    const profiler = new IntegrationProfiler().start();
    diagnostics.recordOperationStarted('execution');

    try {
      const result = await kernel.execute<TInput, TOutput>(input, handler, options);
      const durationMs = profiler.elapsedMs;

      if (result.success) {
        diagnostics.recordOperationCompleted(durationMs);
      } else {
        diagnostics.recordOperationFailed(durationMs);
      }

      return result;
    } catch (err) {
      const durationMs = profiler.elapsedMs;
      diagnostics.recordOperationFailed(durationMs);
      throw err;
    }
  }
}
