import { ExceptionContext as IExceptionContext, RequestContext } from '../types/exceptionTypes';

export class ExceptionContext implements IExceptionContext {
  public readonly requestContext: RequestContext;
  public readonly error: unknown;
  private readonly _attributes = new Map<string, unknown>();

  constructor(requestContext: RequestContext, error: unknown) {
    this.requestContext = requestContext;
    this.error = error;
  }

  public get<T>(key: string): T | undefined {
    return this._attributes.get(key) as T | undefined;
  }

  public set<T>(key: string, value: T): void {
    this._attributes.set(key, value);
  }
}
