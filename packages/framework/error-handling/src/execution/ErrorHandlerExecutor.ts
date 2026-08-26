import { ErrorHandlingDiagnostics } from '../diagnostics/ErrorHandlingDiagnostics';
import { ErrorHandlerRecursionError } from '../errors/ErrorHandlingErrors';
import {
  ApplicationError,
  ErrorHandlerResult,
  ExecutionContext,
  RegisteredErrorHandlerEntry,
} from '../types/errorHandlingTypes';

export interface HandlerExecutionOutcome<TResult = unknown> {
  readonly action: 'HANDLED' | 'TRANSFORMED' | 'RECOVERED' | 'RETHROWN' | 'UNRESOLVED';
  readonly result?: TResult | undefined;
  readonly transformedError?: unknown | undefined;
  readonly executedCount: number;
}

export class ErrorHandlerExecutor {
  public static async execute<TResult = unknown>(
    handlers: readonly RegisteredErrorHandlerEntry<unknown, unknown>[],
    error: ApplicationError,
    context: ExecutionContext,
    rawError: unknown,
    diagnostics: ErrorHandlingDiagnostics,
  ): Promise<HandlerExecutionOutcome<TResult>> {
    const executedHandlerIds = new Set<string>();
    let executedCount = 0;
    let hasRethrown = false;

    for (const entry of handlers) {
      if (executedHandlerIds.has(entry.id)) {
        throw new ErrorHandlerRecursionError(
          `Recursive error handler loop detected for handler ID: "${entry.id}"`,
          { handlerId: entry.id },
        );
      }
      executedHandlerIds.add(entry.id);

      diagnostics.recordHandlerExecution();
      executedCount++;

      let handlerResult: ErrorHandlerResult<TResult> | undefined;

      try {
        handlerResult = (await entry.handler.handle(
          error,
          context,
          rawError,
        )) as ErrorHandlerResult<TResult>;
      } catch {
        diagnostics.recordHandlerFailure();
        continue; // Isolate handler failures and proceed to next handler
      }

      if (!handlerResult || typeof handlerResult !== 'object') {
        continue;
      }

      switch (handlerResult.action) {
        case 'HANDLE':
          return {
            action: 'HANDLED',
            executedCount,
          };
        case 'TRANSFORM':
          return {
            action: 'TRANSFORMED',
            transformedError: handlerResult.transformedError ?? handlerResult.error,
            executedCount,
          };
        case 'RECOVER':
          return {
            action: 'RECOVERED',
            result: handlerResult.result,
            executedCount,
          };
        case 'RETHROW':
          hasRethrown = true;
          continue;
        default:
          continue;
      }
    }

    return {
      action: hasRethrown ? 'RETHROWN' : 'UNRESOLVED',
      executedCount,
    };
  }
}
