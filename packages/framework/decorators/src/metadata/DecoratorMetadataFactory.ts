import { MetadataType } from '@coreforge/contracts';

import { MetadataIdGenerator } from './MetadataIdGenerator';
import { DecoratorRegistration } from '../registry/DecoratorRegistration';
import {
  Constructor,
  ControllerOptions,
  InjectableOptions,
  InterceptorOptions,
  MiddlewareOptions,
  ModuleOptions,
  ParamOptions,
  ProviderOptions,
  SecurityOptions,
} from '../types/decoratorTypes';

export class DecoratorMetadataFactory {
  public static createModuleMetadata(
    target: Constructor,
    options?: ModuleOptions,
  ): DecoratorRegistration {
    const name = options?.name || target.name;
    const id = MetadataIdGenerator.generateModuleId(name);
    return new DecoratorRegistration({
      id,
      type: MetadataType.MODULE,
      target: name,
      targetRef: target,
      properties: {
        name,
        controllers: options?.controllers || [],
        providers: options?.providers || [],
        dependencies: options?.dependencies || [],
        imports: options?.imports || [],
        exports: options?.exports || [],
      },
    });
  }

  public static createControllerMetadata(
    target: Constructor,
    options?: ControllerOptions | string,
  ): DecoratorRegistration {
    const path =
      typeof options === 'string' ? options : options?.path !== undefined ? options.path : '/';
    const normPath = MetadataIdGenerator.normalizePath(path);
    const name = typeof options === 'object' && options?.name ? options.name : target.name;
    const id = MetadataIdGenerator.generateControllerId(name);

    return new DecoratorRegistration({
      id,
      type: MetadataType.CONTROLLER,
      target: name,
      targetRef: target,
      properties: {
        name,
        path: normPath,
      },
    });
  }

  public static createActionMetadata(
    controllerName: string,
    actionName: string,
    targetRef?: unknown,
  ): DecoratorRegistration {
    const id = MetadataIdGenerator.generateActionId(controllerName, actionName);
    return new DecoratorRegistration({
      id,
      type: MetadataType.ACTION,
      target: controllerName,
      targetRef,
      propertyKey: actionName,
      properties: {
        name: actionName,
      },
    });
  }

  public static createRouteMetadata(
    controllerName: string,
    actionName: string,
    method: string,
    path: string,
    targetRef?: unknown,
  ): DecoratorRegistration {
    const normPath = MetadataIdGenerator.normalizePath(path);
    const id = MetadataIdGenerator.generateRouteId(controllerName, actionName, method, normPath);

    return new DecoratorRegistration({
      id,
      type: MetadataType.ROUTE,
      target: controllerName,
      targetRef,
      propertyKey: actionName,
      properties: {
        method: method.toUpperCase(),
        path: normPath,
        actionName,
      },
    });
  }

  public static createParameterMetadata(
    controllerName: string,
    actionName: string,
    options: ParamOptions,
    targetRef?: unknown,
  ): DecoratorRegistration {
    const id = MetadataIdGenerator.generateParamId(
      controllerName,
      actionName,
      options.index,
      options.source,
      options.name,
    );

    return new DecoratorRegistration({
      id,
      type: MetadataType.PARAMETER,
      target: controllerName,
      targetRef,
      propertyKey: actionName,
      parameterIndex: options.index,
      properties: {
        name: options.name,
        source: options.source,
        index: options.index,
        required: options.required,
        type: options.type,
      },
    });
  }

  public static createProviderMetadata(
    target: Constructor | string,
    options?: ProviderOptions | InjectableOptions,
  ): DecoratorRegistration {
    const name = typeof target === 'function' ? target.name : target;
    const serviceToken = options?.serviceToken
      ? String(
          typeof options.serviceToken === 'function'
            ? options.serviceToken.name
            : options.serviceToken,
        )
      : name;
    const id = MetadataIdGenerator.generateProviderId(serviceToken);

    return new DecoratorRegistration({
      id,
      type: MetadataType.PROVIDER,
      target: name,
      targetRef: typeof target === 'function' ? target : undefined,
      properties: {
        serviceToken,
        scope: options?.scope || 'SINGLETON',
        useClass: (options as ProviderOptions)?.useClass,
        useValue: (options as ProviderOptions)?.useValue,
        useFactory: (options as ProviderOptions)?.useFactory,
      },
    });
  }

  public static createMiddlewareMetadata(
    targetName: string,
    middleware: unknown,
    options?: MiddlewareOptions,
    propertyKey?: string | symbol,
    targetRef?: unknown,
  ): DecoratorRegistration {
    const mwName =
      typeof middleware === 'function'
        ? middleware.name
        : (middleware as { name?: string })?.name || 'Middleware';
    const id = MetadataIdGenerator.generateMiddlewareId(
      targetName,
      propertyKey ? `${String(propertyKey)}:${mwName}` : mwName,
    );

    return new DecoratorRegistration({
      id,
      type: MetadataType.MIDDLEWARE,
      target: targetName,
      targetRef,
      propertyKey,
      properties: {
        middleware,
        middlewareName: mwName,
        priority: options?.priority,
        group: options?.group,
      },
    });
  }

  public static createInterceptorMetadata(
    targetName: string,
    interceptor: unknown,
    options?: InterceptorOptions,
    propertyKey?: string | symbol,
    targetRef?: unknown,
  ): DecoratorRegistration {
    const intName =
      typeof interceptor === 'function'
        ? interceptor.name
        : (interceptor as { name?: string })?.name || 'Interceptor';
    const id = MetadataIdGenerator.generateInterceptorId(
      targetName,
      propertyKey ? `${String(propertyKey)}:${intName}` : intName,
    );

    return new DecoratorRegistration({
      id,
      type: MetadataType.INTERCEPTOR,
      target: targetName,
      targetRef,
      propertyKey,
      properties: {
        interceptor,
        interceptorName: intName,
        priority: options?.priority,
      },
    });
  }

  public static createGuardMetadata(
    targetName: string,
    guard: unknown,
    propertyKey?: string | symbol,
    targetRef?: unknown,
  ): DecoratorRegistration {
    const guardName =
      typeof guard === 'function' ? guard.name : (guard as { name?: string })?.name || 'Guard';
    const id = MetadataIdGenerator.generateSecurityId(
      targetName,
      propertyKey ? `guard:${String(propertyKey)}:${guardName}` : `guard:${guardName}`,
    );

    return new DecoratorRegistration({
      id,
      type: MetadataType.SECURITY,
      target: targetName,
      targetRef,
      propertyKey,
      properties: {
        guard,
        guardName,
        policy: 'guard',
      },
    });
  }

  public static createSecurityMetadata(
    targetName: string,
    options: SecurityOptions,
    propertyKey?: string | symbol,
    targetRef?: unknown,
  ): DecoratorRegistration {
    const rolesStr = options.roles?.join(',') || 'custom';
    const id = MetadataIdGenerator.generateSecurityId(
      targetName,
      propertyKey ? `sec:${String(propertyKey)}:${rolesStr}` : `sec:${rolesStr}`,
    );

    return new DecoratorRegistration({
      id,
      type: MetadataType.SECURITY,
      target: targetName,
      targetRef,
      propertyKey,
      properties: {
        roles: options.roles ? [...options.roles] : [],
        permissions: options.permissions ? [...options.permissions] : [],
        policy: options.policy,
      },
    });
  }

  public static createPropertyInjectionMetadata(
    targetName: string,
    propertyKey: string | symbol,
    token: unknown,
    targetRef?: unknown,
  ): DecoratorRegistration {
    const tokenStr = typeof token === 'function' ? token.name : String(token);
    const id = `inject:${targetName}:${String(propertyKey)}:${tokenStr}`;

    return new DecoratorRegistration({
      id,
      type: MetadataType.PROVIDER,
      target: targetName,
      targetRef,
      propertyKey,
      properties: {
        token,
        tokenName: tokenStr,
        propertyKey: String(propertyKey),
        injectionType: 'property',
      },
    });
  }
}
