import { InitializedRuntime } from '@coreforge/contracts';

export interface ExecutionPlan {
  readonly modules: readonly unknown[];
  readonly providers: readonly unknown[];
  readonly controllers: readonly unknown[];
  readonly routes: readonly unknown[];
  readonly middleware: readonly unknown[];
  readonly interceptors: readonly unknown[];
  readonly security: readonly unknown[];
  readonly httpServer: readonly unknown[];
}

export class ExecutionPlanner {
  public plan(runtime: InitializedRuntime): ExecutionPlan {
    const httpServer: unknown[] = [
      { id: 'http-server', type: 'HTTP_SERVER', state: 'INITIALIZED' },
    ];
    return {
      modules: [...runtime.modules],
      providers: [...runtime.providers],
      controllers: [...runtime.controllers],
      routes: [...runtime.routes],
      middleware: [...runtime.middleware],
      interceptors: [...runtime.interceptors],
      security: [...runtime.security],
      httpServer,
    };
  }
}
