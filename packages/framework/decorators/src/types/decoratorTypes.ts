import { RouteMethod } from '@coreforge/contracts';

export type Constructor<T = unknown> = new (...args: unknown[]) => T;

export interface ModuleOptions {
  readonly name?: string | undefined;
  readonly controllers?: readonly Constructor[] | undefined;
  readonly providers?: readonly (Constructor | unknown)[] | undefined;
  readonly imports?: readonly unknown[] | undefined;
  readonly exports?: readonly unknown[] | undefined;
  readonly dependencies?: readonly string[] | undefined;
}

export interface ControllerOptions {
  readonly path?: string | undefined;
  readonly name?: string | undefined;
}

export interface RouteOptions {
  readonly path?: string | undefined;
  readonly method?: RouteMethod | string | undefined;
  readonly name?: string | undefined;
}

export interface InjectableOptions {
  readonly serviceToken?: string | unknown | undefined;
  readonly scope?: 'SINGLETON' | 'TRANSIENT' | 'REQUEST' | undefined;
}

export interface ProviderOptions {
  readonly serviceToken?: string | unknown | undefined;
  readonly scope?: 'SINGLETON' | 'TRANSIENT' | 'REQUEST' | undefined;
  readonly useClass?: Constructor | undefined;
  readonly useValue?: unknown | undefined;
  readonly useFactory?: ((...args: unknown[]) => unknown) | undefined;
}

export type ParamSource = 'param' | 'query' | 'body' | 'header' | 'cookie';

export interface ParamOptions {
  readonly name?: string | undefined;
  readonly source: ParamSource;
  readonly index: number;
  readonly required?: boolean | undefined;
  readonly type?: unknown | undefined;
}

export interface MiddlewareOptions {
  readonly middleware: unknown | readonly unknown[];
  readonly priority?: number | undefined;
  readonly group?: string | undefined;
}

export interface InterceptorOptions {
  readonly interceptor: unknown | readonly unknown[];
  readonly priority?: number | undefined;
}

export interface GuardOptions {
  readonly guard: unknown | readonly unknown[];
}

export interface SecurityOptions {
  readonly roles?: readonly string[] | undefined;
  readonly permissions?: readonly string[] | undefined;
  readonly policy?: unknown | undefined;
}

export type ClassDecoratorType = <TFunction extends Constructor>(
  target: TFunction,
) => TFunction | void;

export type MethodDecoratorType = <T>(
  target: object,
  propertyKey: string | symbol,
  descriptor: TypedPropertyDescriptor<T>,
) => TypedPropertyDescriptor<T> | void;

export type ParameterDecoratorType = (
  target: object,
  propertyKey: string | symbol | undefined,
  parameterIndex: number,
) => void;

export type PropertyDecoratorType = (target: object, propertyKey: string | symbol) => void;
