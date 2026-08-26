import { InterceptorError, InterceptorRegistrationError } from '../errors/InterceptorErrors';
import { Interceptor, InterceptorOptions } from '../types/interceptorTypes';

interface RegisteredInterceptorEntry {
  readonly interceptor: Interceptor<unknown, unknown>;
  readonly priority: number;
  readonly sequence: number;
}

export class InterceptorRegistry {
  private readonly _entries: RegisteredInterceptorEntry[] = [];
  private _sequenceCounter = 0;
  private _locked = false;

  public register<TInput, TResult>(
    interceptor: Interceptor<TInput, TResult>,
    options?: InterceptorOptions,
  ): void {
    if (this._locked) {
      throw new InterceptorRegistrationError('Cannot register interceptor after engine is READY');
    }

    if (!interceptor || typeof interceptor !== 'object') {
      throw new InterceptorError(
        'Interceptor must be an object implementing the Interceptor interface',
        'CF-INTERCEPTOR-ERROR',
        { interceptor },
      );
    }

    if (typeof interceptor.intercept !== 'function') {
      throw new InterceptorError(
        'Interceptor must have an intercept(input, context, next) function',
        'CF-INTERCEPTOR-ERROR',
        { interceptor },
      );
    }

    const priority = options?.priority ?? 0;
    const sequence = ++this._sequenceCounter;

    this._entries.push({
      interceptor: interceptor as Interceptor<unknown, unknown>,
      priority,
      sequence,
    });
  }

  public lock(): void {
    this._locked = true;
  }

  public getSnapshot(): readonly Interceptor<unknown, unknown>[] {
    const sorted = [...this._entries].sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority; // priority DESC
      }
      return a.sequence - b.sequence; // sequence ASC
    });

    return Object.freeze(sorted.map((e) => e.interceptor));
  }

  public get size(): number {
    return this._entries.length;
  }
}
