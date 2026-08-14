import { RuntimeAssembly } from '@coreforge/contracts';

import { ControllerInitializer } from './ControllerInitializer';
import { InterceptorInitializer } from './InterceptorInitializer';
import { MiddlewareInitializer } from './MiddlewareInitializer';
import { ModuleInitializer } from './ModuleInitializer';
import { ProviderInitializer } from './ProviderInitializer';
import { RouteInitializer } from './RouteInitializer';
import { SecurityInitializer } from './SecurityInitializer';
import { RuntimeInitializationError } from '../errors/RuntimeInitializationErrors';
import { RuntimeRegistry } from '../registry/RuntimeRegistry';
import { InitializationRollbackManager } from '../rollback/InitializationRollbackManager';

export class InitializationExecutor {
  public async execute(
    assembly: RuntimeAssembly,
    registry: RuntimeRegistry,
    rollback: InitializationRollbackManager,
  ): Promise<void> {
    const moduleInit = new ModuleInitializer();
    const providerInit = new ProviderInitializer();
    const ctrlInit = new ControllerInitializer();
    const routeInit = new RouteInitializer();
    const middlewareInit = new MiddlewareInitializer();
    const interceptorInit = new InterceptorInitializer();
    const securityInit = new SecurityInitializer();

    try {
      for (const desc of assembly.modules) {
        await moduleInit.initialize(
          desc as {
            id: string;
            name?: string;
            dependencies?: readonly string[];
          },
          registry,
          rollback,
        );
      }
      for (const desc of assembly.providers) {
        await providerInit.initialize(
          desc as {
            id: string;
            parentId?: string;
            serviceToken?: string;
            scope?: string;
          },
          registry,
          rollback,
        );
      }
      for (const desc of assembly.controllers) {
        await ctrlInit.initialize(
          desc as { id: string; name?: string; parentId?: string },
          registry,
          rollback,
        );
      }
      for (const desc of assembly.routes) {
        await routeInit.initialize(
          desc as {
            id: string;
            parentId?: string;
            path?: string;
            method?: string;
          },
          registry,
          rollback,
        );
      }
      for (const desc of assembly.middleware) {
        await middlewareInit.initialize(
          desc as { id: string; parentId?: string },
          registry,
          rollback,
        );
      }
      for (const desc of assembly.interceptors) {
        await interceptorInit.initialize(
          desc as { id: string; parentId?: string },
          registry,
          rollback,
        );
      }
      for (const desc of assembly.security) {
        await securityInit.initialize(
          desc as { id: string; parentId?: string },
          registry,
          rollback,
        );
      }
    } catch (err: unknown) {
      await rollback.rollback();
      const msg = err instanceof Error ? err.message : String(err);
      throw new RuntimeInitializationError(
        `InitializationExecutor: component initialization failed: ${msg}`,
        { cause: err as Record<string, unknown> },
      );
    }
  }
}
