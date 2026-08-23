import { ExceptionHandlerRegistry, RegisteredHandlerEntry } from './ExceptionHandlerRegistry';
import { FallbackExceptionHandler } from './FallbackExceptionHandler';
import { ErrorClassifier } from '../classifier/ErrorClassifier';
import { ExceptionContext, ExceptionHandler } from '../types/exceptionTypes';

export class ExceptionHandlerResolver {
  private readonly _registry: ExceptionHandlerRegistry;
  private readonly _fallback: FallbackExceptionHandler;

  constructor(
    registry: ExceptionHandlerRegistry,
    fallback: FallbackExceptionHandler = new FallbackExceptionHandler(),
  ) {
    this._registry = registry;
    this._fallback = fallback;
  }

  public async resolve(error: unknown, context: ExceptionContext): Promise<ExceptionHandler> {
    const classification = ErrorClassifier.classify(error);

    // 1. Exact Constructor Match
    if (typeof error === 'object' && error !== null) {
      const constructor = (error as { constructor?: unknown }).constructor;
      if (typeof constructor === 'function') {
        const entries = this._sortEntries(
          this._registry.getEntriesByConstructor(constructor as never),
        );
        for (const entry of entries) {
          const can = await Promise.resolve(entry.handler.canHandle(error, context));
          if (can) {
            return entry.handler;
          }
        }
      }
    }

    // 2. Error-Code Match
    if (classification.code) {
      const entries = this._sortEntries(this._registry.getEntriesByCode(classification.code));
      for (const entry of entries) {
        const can = await Promise.resolve(entry.handler.canHandle(error, context));
        if (can) {
          return entry.handler;
        }
      }
    }

    // 3. Category Match
    if (classification.category) {
      const entries = this._sortEntries(
        this._registry.getEntriesByCategory(classification.category),
      );
      for (const entry of entries) {
        const can = await Promise.resolve(entry.handler.canHandle(error, context));
        if (can) {
          return entry.handler;
        }
      }
    }

    // 4. Custom Registered Handlers
    const customEntries = this._sortEntries(this._registry.getCustomEntries());
    for (const entry of customEntries) {
      const can = await Promise.resolve(entry.handler.canHandle(error, context));
      if (can) {
        return entry.handler;
      }
    }

    // 5. Fallback Handler
    return this._fallback;
  }

  private _sortEntries(entries: readonly RegisteredHandlerEntry[]): RegisteredHandlerEntry[] {
    return [...entries].sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority; // priority DESC
      }
      return a.registrationIndex - b.registrationIndex; // registrationIndex ASC
    });
  }
}
