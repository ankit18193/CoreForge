import { EventBus } from '@coreforge/contracts';

import { KernelLifecycleManager } from './KernelLifecycleManager';
import { KernelState } from './KernelState';
import { ApplicationContext } from '../context/ApplicationContext';
import { ApplicationDiagnostics } from '../diagnostics/ApplicationDiagnostics';
import { ApplicationStateError } from '../errors/ApplicationErrors';
import { ApplicationFailedEvent } from '../events/ApplicationFailedEvent';
import { ApplicationStartedEvent } from '../events/ApplicationStartedEvent';
import { ApplicationStoppedEvent } from '../events/ApplicationStoppedEvent';
import { ApplicationStoppingEvent } from '../events/ApplicationStoppingEvent';
import { KernelProfiler } from '../internal/KernelProfiler';
import { ShutdownCoordinator } from '../lifecycle/ShutdownCoordinator';
import { StartupCoordinator, StartupStep } from '../lifecycle/StartupCoordinator';
import { ApplicationRegistry } from '../registry/ApplicationRegistry';
import { ComponentRegistry } from '../registry/ComponentRegistry';

export class ApplicationKernel {
  private readonly _applicationId: string;
  private readonly _lifecycle = new KernelLifecycleManager();
  private readonly _registry = new ApplicationRegistry();
  private readonly _components = new ComponentRegistry();
  private readonly _diagnostics: ApplicationDiagnostics;

  private readonly _shutdownCoordinator = new ShutdownCoordinator();
  private readonly _startupCoordinator: StartupCoordinator;

  private _context: ApplicationContext | undefined;
  private _isStarting = false;

  constructor(applicationId: string) {
    this._applicationId = applicationId;
    this._diagnostics = new ApplicationDiagnostics(this._applicationId, this._registry);
    this._startupCoordinator = new StartupCoordinator(this._shutdownCoordinator);
  }

  public get state(): KernelState {
    return this._lifecycle.state;
  }

  public get diagnostics(): ApplicationDiagnostics {
    return this._diagnostics;
  }

  public get registry(): ApplicationRegistry {
    return this._registry;
  }

  public get components(): ComponentRegistry {
    return this._components;
  }

  public get context(): ApplicationContext | undefined {
    return this._context;
  }

  public registerStep(step: StartupStep): void {
    this._startupCoordinator.register(step);
  }

  public setContext(context: ApplicationContext): void {
    this._context = context;
  }

  public async start(): Promise<void> {
    if (this._isStarting) {
      throw new ApplicationStateError('ApplicationKernel: Parallel start attempts are rejected.');
    }

    if (this._lifecycle.state === KernelState.RUNNING) {
      return;
    }

    this._isStarting = true;
    this._lifecycle.transitionTo(KernelState.STARTING);
    this._diagnostics.setDiagnosticsState(KernelState.STARTING);

    const profiler = new KernelProfiler();
    profiler.start();

    try {
      await this._startupCoordinator.startup();

      this._lifecycle.transitionTo(KernelState.RUNNING);
      this._diagnostics.setDiagnosticsState(KernelState.RUNNING);
      this._diagnostics.recordStartupDuration(profiler.durationMs);

      const eventBusComp = this._components.get('EventBus');
      if (eventBusComp) {
        const bus = eventBusComp.component as EventBus;
        await bus.publish(new ApplicationStartedEvent());
      }
    } catch (err: unknown) {
      this._lifecycle.transitionTo(KernelState.FAILED);
      this._diagnostics.setDiagnosticsState(KernelState.FAILED);

      const eventBusComp = this._components.get('EventBus');
      if (eventBusComp) {
        const bus = eventBusComp.component as EventBus;
        await bus.publish(
          new ApplicationFailedEvent(err instanceof Error ? err : new Error(String(err))),
        );
      }
      throw err;
    } finally {
      this._isStarting = false;
    }
  }

  public async stop(): Promise<void> {
    if (this._lifecycle.state === KernelState.STOPPED) {
      return;
    }

    this._lifecycle.transitionTo(KernelState.STOPPING);
    this._diagnostics.setDiagnosticsState(KernelState.STOPPING);

    const profiler = new KernelProfiler();
    profiler.start();

    const eventBusComp = this._components.get('EventBus');
    if (eventBusComp) {
      const bus = eventBusComp.component as EventBus;
      await bus.publish(new ApplicationStoppingEvent());
    }

    try {
      await this._shutdownCoordinator.shutdown();

      this._lifecycle.transitionTo(KernelState.STOPPED);
      this._diagnostics.setDiagnosticsState(KernelState.STOPPED);
      this._diagnostics.recordShutdownDuration(profiler.durationMs);

      if (eventBusComp) {
        const bus = eventBusComp.component as EventBus;
        await bus.publish(new ApplicationStoppedEvent());
      }
    } catch (err: unknown) {
      this._lifecycle.transitionTo(KernelState.FAILED);
      this._diagnostics.setDiagnosticsState(KernelState.FAILED);
      throw err;
    }
  }

  public transitionTo(state: KernelState): void {
    this._lifecycle.transitionTo(state);
    this._diagnostics.setDiagnosticsState(state);
  }
}
