import {
  ActionDescriptor,
  ActionExecutionContext as IActionExecutionContext,
  ActionExecutionEngine as IActionExecutionEngine,
  ExecutionActionInvoker,
  InjectionToken,
  ParameterBindingDescriptor,
  RequestContext,
} from '@coreforge/contracts';

export type {
  ActionDescriptor,
  IActionExecutionContext,
  IActionExecutionEngine,
  ExecutionActionInvoker,
  InjectionToken,
  ParameterBindingDescriptor,
  RequestContext,
};

export interface Guard {
  canActivate(context: IActionExecutionContext): boolean | Promise<boolean>;
}

export interface ActionMiddleware {
  handle(context: IActionExecutionContext, next: () => Promise<unknown>): Promise<unknown>;
}

export interface Interceptor {
  intercept(context: IActionExecutionContext, next: () => Promise<unknown>): Promise<unknown>;
}
