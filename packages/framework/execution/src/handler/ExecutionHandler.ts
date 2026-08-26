import { ExecutionHandlerError } from '../errors/ExecutionErrors';
import { ExecutionHandler } from '../types/executionTypes';

export type { ExecutionHandler };

export class ExecutionHandlerValidator {
  public static validate<TInput, TResult>(
    handler: unknown,
  ): ExecutionHandler<TInput, TResult> {
    if (typeof handler !== 'function') {
      throw new ExecutionHandlerError('Execution handler must be a function', { handler });
    }
    return handler as ExecutionHandler<TInput, TResult>;
  }
}
