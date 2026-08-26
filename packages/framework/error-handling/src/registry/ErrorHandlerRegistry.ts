import { ErrorHandlerRegistrationError } from '../errors/ErrorHandlingErrors';
import {
  ErrorHandler,
  ErrorHandlerOptions,
  RegisteredErrorHandlerEntry,
} from '../types/errorHandlingTypes';

export class ErrorHandlerRegistry {
  private readonly _handlers: RegisteredErrorHandlerEntry<unknown, unknown>[] = [];
  private readonly _registeredIds = new Set<string>();
  private _sequenceCounter = 0;
  private _locked = false;

  public register<TError = unknown, TResult = unknown>(
    handler: ErrorHandler<TError, TResult>,
    options?: ErrorHandlerOptions,
  ): string {
    if (this._locked) {
      throw new ErrorHandlerRegistrationError(
        'Cannot register error handler after error handling engine is READY',
      );
    }

    if (!handler || typeof handler !== 'object') {
      throw new ErrorHandlerRegistrationError('Error handler must be an object');
    }

    if (typeof handler.handle !== 'function') {
      throw new ErrorHandlerRegistrationError(
        'Error handler must provide a handle(error, context) function',
      );
    }

    const sequence = ++this._sequenceCounter;
    const id = options?.id || `error_handler_${sequence}`;

    if (this._registeredIds.has(id)) {
      throw new ErrorHandlerRegistrationError(`Duplicate error handler registration ID: "${id}"`, {
        handlerId: id,
      });
    }

    const priority = options?.priority ?? 0;
    const category = options?.category;
    const code = options?.code;

    const entry: RegisteredErrorHandlerEntry<unknown, unknown> = {
      id,
      handler: handler as ErrorHandler<unknown, unknown>,
      priority,
      sequence,
      category,
      code,
    };

    this._registeredIds.add(id);
    this._handlers.push(entry);

    // Sort by priority DESC, then sequence ASC
    this._handlers.sort((a, b) => b.priority - a.priority || a.sequence - b.sequence);

    return id;
  }

  public lock(): void {
    this._locked = true;
  }

  public getAll(): readonly RegisteredErrorHandlerEntry<unknown, unknown>[] {
    return [...this._handlers];
  }

  public get size(): number {
    return this._handlers.length;
  }
}
