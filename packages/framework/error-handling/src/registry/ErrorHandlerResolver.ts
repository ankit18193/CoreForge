import { ErrorHandlerRegistry } from './ErrorHandlerRegistry';
import { ApplicationError, RegisteredErrorHandlerEntry } from '../types/errorHandlingTypes';

export class ErrorHandlerResolver {
  public static resolve<TError = unknown, TResult = unknown>(
    registry: ErrorHandlerRegistry,
    error: ApplicationError,
  ): readonly RegisteredErrorHandlerEntry<TError, TResult>[] {
    const all = registry.getAll();

    const matched = all.filter((entry) => {
      if (entry.category && entry.category !== error.category) {
        return false;
      }

      if (entry.code && entry.code !== error.code) {
        return false;
      }

      return true;
    });

    return matched as readonly RegisteredErrorHandlerEntry<TError, TResult>[];
  }
}
