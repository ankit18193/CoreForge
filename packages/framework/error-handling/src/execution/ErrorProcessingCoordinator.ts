import { ErrorHandlerExecutor } from './ErrorHandlerExecutor';
import { ErrorHandlingDiagnostics } from '../diagnostics/ErrorHandlingDiagnostics';
import { ErrorHandlingProfiler } from '../internal/ErrorHandlingProfiler';
import { ErrorNormalizer } from '../normalization/ErrorNormalizer';
import { ErrorHandlerRegistry } from '../registry/ErrorHandlerRegistry';
import { ErrorHandlerResolver } from '../registry/ErrorHandlerResolver';
import { ErrorResultFactory } from '../result/ErrorResultFactory';
import {
  ErrorProcessingOptions,
  ErrorProcessingResult,
  ExecutionContext,
} from '../types/errorHandlingTypes';

export class ErrorProcessingCoordinator {
  public static async coordinate<TResult = unknown>(
    rawError: unknown,
    context: ExecutionContext,
    registry: ErrorHandlerRegistry,
    diagnostics: ErrorHandlingDiagnostics,
    options?: ErrorProcessingOptions,
    customSensitiveKeys?: readonly string[],
  ): Promise<ErrorProcessingResult<TResult>> {
    const profiler = new ErrorHandlingProfiler().start();
    diagnostics.recordProcessingStarted();

    const normalizedError = ErrorNormalizer.normalize(rawError, options, customSensitiveKeys);

    if (normalizedError.category === 'UNKNOWN') {
      diagnostics.recordUnknown();
    }

    // Cancellation check
    if (context.signal.aborted || normalizedError.category === 'CANCELLED') {
      const durationMs = Math.round(profiler.elapsedMs * 100) / 100;
      diagnostics.recordCancelled();
      diagnostics.recordProcessingFinished(durationMs);
      return ErrorResultFactory.createCancelled<TResult>(
        normalizedError,
        context.executionId,
        durationMs,
      );
    }

    const matchedHandlers = ErrorHandlerResolver.resolve(registry, normalizedError);

    if (matchedHandlers.length === 0) {
      const durationMs = Math.round(profiler.elapsedMs * 100) / 100;
      diagnostics.recordProcessingFinished(durationMs);
      return ErrorResultFactory.createUnresolved<TResult>(
        normalizedError,
        context.executionId,
        durationMs,
      );
    }

    const outcome = await ErrorHandlerExecutor.execute<TResult>(
      matchedHandlers,
      normalizedError,
      context,
      rawError,
      diagnostics,
    );

    const durationMs = Math.round(profiler.elapsedMs * 100) / 100;
    diagnostics.recordProcessingFinished(durationMs);

    switch (outcome.action) {
      case 'HANDLED':
        diagnostics.recordHandled();
        return ErrorResultFactory.createHandled<TResult>(
          normalizedError,
          context.executionId,
          durationMs,
          outcome.executedCount,
        );

      case 'TRANSFORMED': {
        diagnostics.recordTransformed();
        const transformedError = ErrorNormalizer.normalize(
          outcome.transformedError,
          options,
          customSensitiveKeys,
        );
        return ErrorResultFactory.createTransformed<TResult>(
          normalizedError,
          transformedError,
          context.executionId,
          durationMs,
          outcome.executedCount,
        );
      }

      case 'RECOVERED':
        diagnostics.recordRecovered();
        return ErrorResultFactory.createRecovered<TResult>(
          normalizedError,
          outcome.result as TResult,
          context.executionId,
          durationMs,
          outcome.executedCount,
        );

      case 'RETHROWN':
        diagnostics.recordRethrown();
        return ErrorResultFactory.createRethrown<TResult>(
          normalizedError,
          context.executionId,
          durationMs,
          outcome.executedCount,
        );

      case 'UNRESOLVED':
      default:
        return ErrorResultFactory.createUnresolved<TResult>(
          normalizedError,
          context.executionId,
          durationMs,
        );
    }
  }
}
