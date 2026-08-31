import type {
  HttpBindingContext,
  HttpBindingDefinition,
  HttpBindingDiagnosticsSnapshot,
  HttpBindingResult,
} from '@coreforge/contracts';

import { HttpBindingExecutor } from './HttpBindingExecutor';
import { HttpBindingPlan } from './HttpBindingPlan';
import { HttpBindingRegistry } from './HttpBindingRegistry';
import { HttpBindingResolver } from './HttpBindingResolver';
import { HttpBindingSnapshot } from './HttpBindingSnapshot';
import { HttpBindingDiagnostics } from '../diagnostics/HttpBindingDiagnostics';

export class HttpBindingCoordinator {
  private readonly _registry: HttpBindingRegistry;
  private readonly _resolver: HttpBindingResolver;
  private readonly _diagnostics: HttpBindingDiagnostics;
  private readonly _executor: HttpBindingExecutor;

  constructor(registry?: HttpBindingRegistry, diagnostics?: HttpBindingDiagnostics) {
    this._registry = registry ?? new HttpBindingRegistry();
    this._resolver = new HttpBindingResolver(this._registry);
    this._diagnostics = diagnostics ?? new HttpBindingDiagnostics();
    this._executor = new HttpBindingExecutor(this._resolver, this._diagnostics);
  }

  public get registry(): HttpBindingRegistry {
    return this._registry;
  }

  public get resolver(): HttpBindingResolver {
    return this._resolver;
  }

  public get diagnostics(): HttpBindingDiagnostics {
    return this._diagnostics;
  }

  public register(
    id: string,
    definitionsOrPlan: readonly HttpBindingDefinition[] | HttpBindingPlan,
  ): this {
    this._registry.register(id, definitionsOrPlan);
    return this;
  }

  public bind<T = Record<string, unknown>>(
    planId: string,
    context: HttpBindingContext,
  ): HttpBindingResult<T> {
    const plan = this._resolver.resolvePlan(planId);
    if (!plan) {
      return HttpBindingSnapshot.createResult<T>(true, 0, undefined as unknown as T, []);
    }

    return this.bindPlan<T>(plan, context);
  }

  public bindPlan<T = Record<string, unknown>>(
    plan: HttpBindingPlan,
    context: HttpBindingContext,
  ): HttpBindingResult<T> {
    return this._executor.execute<T>(plan, context);
  }

  public getDiagnostics(): HttpBindingDiagnosticsSnapshot {
    return this._diagnostics.getSnapshot();
  }

  public resetDiagnostics(): void {
    this._diagnostics.reset();
  }
}
