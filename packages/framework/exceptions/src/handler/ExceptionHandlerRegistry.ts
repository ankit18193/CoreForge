import { ErrorCategory, ExceptionHandler } from '../types/exceptionTypes';

export type ErrorConstructorType<T = unknown> =
  (new (...args: never[]) => T) | (abstract new (...args: never[]) => T);

export interface RegisteredHandlerEntry {
  readonly handler: ExceptionHandler;
  readonly priority: number;
  readonly registrationIndex: number;
  readonly typeTarget?: ErrorConstructorType | undefined;
  readonly codeTarget?: string | undefined;
  readonly categoryTarget?: ErrorCategory | undefined;
}

export class ExceptionHandlerRegistry {
  private _registrationCounter = 0;
  private readonly _byConstructor = new Map<ErrorConstructorType, RegisteredHandlerEntry[]>();
  private readonly _byCode = new Map<string, RegisteredHandlerEntry[]>();
  private readonly _byCategory = new Map<ErrorCategory, RegisteredHandlerEntry[]>();
  private readonly _customHandlers: RegisteredHandlerEntry[] = [];

  public registerType(
    errorConstructor: ErrorConstructorType,
    handler: ExceptionHandler,
    priority = handler.priority ?? 0,
  ): this {
    const entry: RegisteredHandlerEntry = {
      handler,
      priority,
      registrationIndex: ++this._registrationCounter,
      typeTarget: errorConstructor,
    };
    const list = this._byConstructor.get(errorConstructor) || [];
    list.push(entry);
    this._byConstructor.set(errorConstructor, list);
    return this;
  }

  public registerCode(
    code: string,
    handler: ExceptionHandler,
    priority = handler.priority ?? 0,
  ): this {
    const entry: RegisteredHandlerEntry = {
      handler,
      priority,
      registrationIndex: ++this._registrationCounter,
      codeTarget: code,
    };
    const list = this._byCode.get(code) || [];
    list.push(entry);
    this._byCode.set(code, list);
    return this;
  }

  public registerCategory(
    category: ErrorCategory,
    handler: ExceptionHandler,
    priority = handler.priority ?? 0,
  ): this {
    const entry: RegisteredHandlerEntry = {
      handler,
      priority,
      registrationIndex: ++this._registrationCounter,
      categoryTarget: category,
    };
    const list = this._byCategory.get(category) || [];
    list.push(entry);
    this._byCategory.set(category, list);
    return this;
  }

  public register(handler: ExceptionHandler, priority = handler.priority ?? 0): this {
    const entry: RegisteredHandlerEntry = {
      handler,
      priority,
      registrationIndex: ++this._registrationCounter,
    };
    this._customHandlers.push(entry);
    return this;
  }

  public unregister(handler: ExceptionHandler): void {
    const filterFn = (e: RegisteredHandlerEntry) => e.handler !== handler;

    for (const [k, v] of this._byConstructor.entries()) {
      this._byConstructor.set(k, v.filter(filterFn));
    }
    for (const [k, v] of this._byCode.entries()) {
      this._byCode.set(k, v.filter(filterFn));
    }
    for (const [k, v] of this._byCategory.entries()) {
      this._byCategory.set(k, v.filter(filterFn));
    }

    const idx = this._customHandlers.findIndex((e) => e.handler === handler);
    if (idx !== -1) {
      this._customHandlers.splice(idx, 1);
    }
  }

  public getEntriesByConstructor(
    constructor: ErrorConstructorType,
  ): readonly RegisteredHandlerEntry[] {
    return this._byConstructor.get(constructor) || [];
  }

  public getEntriesByCode(code: string): readonly RegisteredHandlerEntry[] {
    return this._byCode.get(code) || [];
  }

  public getEntriesByCategory(category: ErrorCategory): readonly RegisteredHandlerEntry[] {
    return this._byCategory.get(category) || [];
  }

  public getCustomEntries(): readonly RegisteredHandlerEntry[] {
    return this._customHandlers;
  }
}
