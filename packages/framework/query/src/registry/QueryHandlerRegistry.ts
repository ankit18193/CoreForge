import { QueryError, QueryHandlerRegistrationError } from '../errors/QueryErrors';
import { QueryHandler } from '../types/queryTypes';

// Control characters check regex (ASCII 0x00-0x1F and 0x7F)
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS_REGEX = /[\x00-\x1F\x7F]/;

export class QueryHandlerRegistry {
  private readonly _handlers = new Map<string, QueryHandler<unknown, unknown>>();
  private _locked = false;

  public register<TPayload, TResult>(type: string, handler: QueryHandler<TPayload, TResult>): void {
    if (this._locked) {
      throw new QueryHandlerRegistrationError('Cannot register handler after query bus is READY', {
        queryType: type,
      });
    }

    if (typeof type !== 'string' || type.trim().length === 0) {
      throw new QueryHandlerRegistrationError('Query type must be a non-empty string', {
        queryType: type,
      });
    }

    if (CONTROL_CHARS_REGEX.test(type)) {
      throw new QueryHandlerRegistrationError('Query type contains invalid control characters', {
        queryType: type,
      });
    }

    if (!handler || typeof handler !== 'object') {
      throw new QueryError(
        'Handler must be an object implementing QueryHandler interface',
        'CF-QUERY-HANDLER-REGISTRATION',
        { queryType: type, handler },
      );
    }

    if (typeof handler.execute !== 'function') {
      throw new QueryError(
        'Handler must have an execute(payload, context) function',
        'CF-QUERY-HANDLER-REGISTRATION',
        { queryType: type, handler },
      );
    }

    if (this._handlers.has(type)) {
      throw new QueryHandlerRegistrationError(
        `Handler for query type "${type}" is already registered`,
        { queryType: type },
      );
    }

    this._handlers.set(type, handler as QueryHandler<unknown, unknown>);
  }

  public lock(): void {
    this._locked = true;
  }

  public get(type: string): QueryHandler<unknown, unknown> | undefined {
    return this._handlers.get(type);
  }

  public has(type: string): boolean {
    return this._handlers.has(type);
  }

  public get size(): number {
    return this._handlers.size;
  }
}
