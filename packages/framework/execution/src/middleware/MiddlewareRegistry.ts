import {
  ExecutionMiddlewareError,
  ExecutionMiddlewareRegistrationError,
} from '../errors/ExecutionErrors';
import { ExecutionMiddleware } from '../types/executionTypes';

export class MiddlewareRegistry {
  private readonly _middlewares: ExecutionMiddleware<any, any>[] = [];
  private _locked = false;

  public register<TInput, TResult>(
    middleware: ExecutionMiddleware<TInput, TResult>,
  ): void {
    if (this._locked) {
      throw new ExecutionMiddlewareRegistrationError(
        'Cannot register middleware after execution engine is READY',
      );
    }

    if (!middleware || typeof middleware !== 'object') {
      throw new ExecutionMiddlewareError(
        'Middleware must be an object implementing the ExecutionMiddleware interface',
        { middleware },
      );
    }

    if (typeof middleware.execute !== 'function') {
      throw new ExecutionMiddlewareError(
        'Middleware must have an execute(input, context, next) function',
        { middleware },
      );
    }

    this._middlewares.push(middleware);
  }

  public lock(): void {
    this._locked = true;
  }

  public getSnapshot(): readonly ExecutionMiddleware<any, any>[] {
    return Object.freeze([...this._middlewares]);
  }

  public get size(): number {
    return this._middlewares.length;
  }
}
