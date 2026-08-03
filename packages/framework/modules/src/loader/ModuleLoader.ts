import { Module } from '@coreforge/contracts';

import { ModuleDescriptor, ModuleState } from '../descriptors/ModuleDescriptor';
import { ModuleDependencyError } from '../errors/ModuleErrors';
import { ModuleExecutionContext } from '../execution/ModuleExecutionContext';
import { ModuleLifecycleManager } from '../lifecycle/ModuleLifecycleManager';
import { ModuleRegistry } from '../registry/ModuleRegistry';
import { DependencyResolver } from '../resolver/DependencyResolver';
import { ModuleConstructor } from '../types/moduleTypes';

export class ModuleLoader {
  private _registry = new ModuleRegistry();
  private _resolver = new DependencyResolver();
  private _lifecycleManager = new ModuleLifecycleManager();

  private _activeContext?: ModuleExecutionContext;
  private _isStarted = false;

  public register(moduleOrClass: Module | ModuleConstructor): void {
    let instance: Module;
    if (typeof moduleOrClass === 'function') {
      instance = new (moduleOrClass as new () => Module)();
    } else {
      instance = moduleOrClass;
    }

    if (!instance.name) {
      throw new ModuleDependencyError('Module name must be specified.');
    }

    const metadata = {
      name: instance.name,
      version: '0.1.0',
      dependencies: instance.dependencies || [],
    };

    const descriptor = new ModuleDescriptor(metadata, instance);
    this._registry.register(descriptor);
  }

  public discover(): string[] {
    return this._registry.getAll().map((d) => d.metadata.name);
  }

  public validate(): void {
    const all = this._registry.getAll();
    const names = new Set<string>();

    for (const desc of all) {
      if (!desc.metadata.name) {
        throw new ModuleDependencyError('Module name is missing.');
      }
      if (names.has(desc.metadata.name)) {
        throw new ModuleDependencyError(`Duplicate module name found: ${desc.metadata.name}`);
      }
      names.add(desc.metadata.name);
    }
  }

  public resolve(): ModuleDescriptor[] {
    this.validate();
    return this._resolver.resolve(this._registry.getAll());
  }

  public async start(config?: unknown): Promise<ModuleExecutionContext> {
    if (this._isStarted) {
      if (this._activeContext) {
        return this._activeContext;
      }
      this._activeContext = new ModuleExecutionContext();
      this._activeContext.complete();
      return this._activeContext;
    }

    const context = new ModuleExecutionContext();
    this._activeContext = context;

    let sorted: ModuleDescriptor[] = [];
    try {
      sorted = this.resolve();
      context.totalModules = sorted.length;
      sorted.forEach((d) => context.startupOrder.push(d.metadata.name));

      context.currentLifecyclePhase = 'Registered';
      await this._lifecycleManager.executePhase('Registered', sorted);

      context.currentLifecyclePhase = 'Configured';
      await this._lifecycleManager.executePhase('Configured', sorted, config);

      context.currentLifecyclePhase = 'Initialized';
      await this._lifecycleManager.executePhase('Initialized', sorted);

      context.currentLifecyclePhase = 'Started';
      await this._lifecycleManager.executePhase('Started', sorted);

      context.currentLifecyclePhase = 'Ready';
      await this._lifecycleManager.executePhase('Ready', sorted);

      sorted.forEach((d) => context.successfulModules.push(d.metadata.name));
      this._isStarted = true;
    } catch (err: unknown) {
      const failedName =
        err && typeof err === 'object' && 'details' in err
          ? (err as { details: Record<string, unknown> | undefined }).details?.module
          : undefined;

      context.failedModule = typeof failedName === 'string' ? failedName : undefined;
      context.capturedException = err instanceof Error ? err : new Error(String(err));

      sorted.forEach((d) => {
        if (d.state === ModuleState.FAILED) {
          context.failedModules.push(d.metadata.name);
        } else if (d.state === ModuleState.READY) {
          context.successfulModules.push(d.metadata.name);
        }
      });

      if (sorted.length > 0) {
        await this.rollback(sorted, context.failedModule);
      }

      throw err;
    } finally {
      context.complete();
    }

    return context;
  }

  public async stop(): Promise<void> {
    if (!this._isStarted) {
      return;
    }

    const sorted = this.resolve();
    const reversed = [...sorted].reverse();

    if (this._activeContext) {
      reversed.forEach((d) => this._activeContext!.shutdownOrder.push(d.metadata.name));
    }

    await this._lifecycleManager.executePhase('Stopping', reversed);
    await this._lifecycleManager.executePhase('Shutdown', reversed);
    await this._lifecycleManager.executePhase('Disposed', reversed);

    this._isStarted = false;
  }

  public has(name: string): boolean {
    return this._registry.has(name);
  }

  public get(name: string): Module | undefined {
    const desc = this._registry.get(name);
    return desc ? desc.instance : undefined;
  }

  public list(): string[] {
    return this.discover();
  }

  public status(name: string): ModuleState | undefined {
    const desc = this._registry.get(name);
    return desc ? desc.state : undefined;
  }

  private async rollback(
    resolvedModules: ModuleDescriptor[],
    failedModuleName?: string,
  ): Promise<void> {
    const reversed = [...resolvedModules].reverse();

    const eligibleForStop = reversed.filter(
      (m) =>
        m.metadata.name !== failedModuleName &&
        (m.state === ModuleState.STARTED || m.state === ModuleState.READY),
    );
    if (eligibleForStop.length > 0) {
      try {
        await this._lifecycleManager.executePhase('Stopping', eligibleForStop);
      } catch {
        // Suppress rollback errors
      }
    }

    const eligibleForShutdown = reversed.filter(
      (m) =>
        m.metadata.name !== failedModuleName &&
        (m.state === ModuleState.CONFIGURED ||
          m.state === ModuleState.INITIALIZED ||
          m.state === ModuleState.STOPPING),
    );
    if (eligibleForShutdown.length > 0) {
      try {
        await this._lifecycleManager.executePhase('Shutdown', eligibleForShutdown);
      } catch {
        // Suppress rollback errors
      }
    }

    const eligibleForDispose = reversed.filter(
      (m) =>
        m.metadata.name !== failedModuleName &&
        m.state !== ModuleState.CREATED &&
        m.state !== ModuleState.REGISTERED &&
        m.state !== ModuleState.DISPOSED,
    );
    if (eligibleForDispose.length > 0) {
      try {
        await this._lifecycleManager.executePhase('Disposed', eligibleForDispose);
      } catch {
        // Suppress rollback errors
      }
    }
  }
}
