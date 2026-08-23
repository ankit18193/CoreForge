import {
  ActionDescriptor,
  ExecutionContext as IExecutionContext,
  InjectionToken,
  RequestContext,
} from '../types/executionTypes';

export class ExecutionContext implements IExecutionContext {
  public readonly requestContext: RequestContext;
  public readonly action: ActionDescriptor;
  public readonly request: unknown;

  constructor(requestContext: RequestContext, action: ActionDescriptor, request: unknown) {
    this.requestContext = requestContext;
    this.action = action;
    this.request = request;
  }

  public resolve<T>(token: InjectionToken<T>): Promise<T> {
    return this.requestContext.resolve(token);
  }
}
