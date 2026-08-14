import { InitializedRuntime } from '@coreforge/contracts';

import { RuntimeStartupError } from '../errors/RuntimeExecutionErrors';
import { RuntimeExecutionRegistry } from '../registry/RuntimeExecutionRegistry';
import { RuntimeShutdownRollbackManager } from '../rollback/RuntimeShutdownRollbackManager';

export class StartupExecutor {
  public async execute(
    runtime: InitializedRuntime,
    registry: RuntimeExecutionRegistry,
    rollback: RuntimeShutdownRollbackManager,
  ): Promise<void> {
    try {
      for (const m of runtime.modules) {
        const component = {
          ...(m as Record<string, unknown>),
          state: 'STARTED',
        };
        const id = (m as { id: string }).id;
        registry.register(id, component);
        rollback.track(id, 'MODULE', () => {
          component.state = 'STOPPED';
        });
      }
      for (const p of runtime.providers) {
        const component = {
          ...(p as Record<string, unknown>),
          state: 'STARTED',
        };
        const id = (p as { id: string }).id;
        registry.register(id, component);
        rollback.track(id, 'PROVIDER', () => {
          component.state = 'STOPPED';
        });
      }
      for (const c of runtime.controllers) {
        const component = {
          ...(c as Record<string, unknown>),
          state: 'STARTED',
        };
        const id = (c as { id: string }).id;
        registry.register(id, component);
        rollback.track(id, 'CONTROLLER', () => {
          component.state = 'STOPPED';
        });
      }
      for (const r of runtime.routes) {
        const component = {
          ...(r as Record<string, unknown>),
          state: 'STARTED',
        };
        const id = (r as { id: string }).id;
        registry.register(id, component);
        rollback.track(id, 'ROUTE', () => {
          component.state = 'STOPPED';
        });
      }
      for (const mid of runtime.middleware) {
        const component = {
          ...(mid as Record<string, unknown>),
          state: 'STARTED',
        };
        const id = (mid as { id: string }).id;
        registry.register(id, component);
        rollback.track(id, 'MIDDLEWARE', () => {
          component.state = 'STOPPED';
        });
      }
      for (const int of runtime.interceptors) {
        const component = {
          ...(int as Record<string, unknown>),
          state: 'STARTED',
        };
        const id = (int as { id: string }).id;
        registry.register(id, component);
        rollback.track(id, 'INTERCEPTOR', () => {
          component.state = 'STOPPED';
        });
      }
      for (const sec of runtime.security) {
        const component = {
          ...(sec as Record<string, unknown>),
          state: 'STARTED',
        };
        const id = (sec as { id: string }).id;
        registry.register(id, component);
        rollback.track(id, 'SECURITY', () => {
          component.state = 'STOPPED';
        });
      }
      const server = { id: 'http-server', state: 'STARTED' };
      registry.register('http-server', server);
      rollback.track('http-server', 'HTTP_SERVER', () => {
        server.state = 'STOPPED';
      });
    } catch (err: unknown) {
      await rollback.rollback();
      const msg = err instanceof Error ? err.message : String(err);
      throw new RuntimeStartupError(
        `StartupExecutor: Startup sequence failed: ${msg}`,
        { cause: err as Record<string, unknown> },
      );
    }
  }
}
