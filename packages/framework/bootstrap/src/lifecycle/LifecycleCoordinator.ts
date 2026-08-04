import { ShutdownManager } from './ShutdownManager';
import { StartupManager } from './StartupManager';
import { BootstrapValidationError } from '../errors/BootstrapErrors';
import { BootstrapExecutionContext } from '../pipeline/BootstrapExecutionContext';
import { BootstrapState } from '../pipeline/BootstrapState';

export class LifecycleCoordinator {
  private readonly _startupManager: StartupManager;
  private readonly _shutdownManager: ShutdownManager;
  private _state: BootstrapState = BootstrapState.CREATED;

  constructor(startupManager: StartupManager, shutdownManager: ShutdownManager) {
    this._startupManager = startupManager;
    this._shutdownManager = shutdownManager;
  }

  public get state(): BootstrapState {
    return this._state;
  }

  public transitionTo(targetState: BootstrapState): void {
    const allowed: Record<BootstrapState, BootstrapState[]> = {
      [BootstrapState.CREATED]: [BootstrapState.STARTING],
      [BootstrapState.BUILDING]: [BootstrapState.CREATED],
      [BootstrapState.STARTING]: [BootstrapState.RUNNING, BootstrapState.FAILED],
      [BootstrapState.RUNNING]: [BootstrapState.STOPPING, BootstrapState.FAILED],
      [BootstrapState.STOPPING]: [BootstrapState.STOPPED, BootstrapState.FAILED],
      [BootstrapState.STOPPED]: [],
      [BootstrapState.FAILED]: [BootstrapState.STOPPING],
    };

    const list = allowed[this._state];
    if (!list.includes(targetState)) {
      throw new BootstrapValidationError(
        `LifecycleCoordinator: invalid state transition from ${this._state} to ${targetState}`,
      );
    }
    this._state = targetState;
  }

  public async start(
    context: BootstrapExecutionContext,
    timeoutMs?: number | undefined,
  ): Promise<void> {
    if (this._state === BootstrapState.STARTING || this._state === BootstrapState.RUNNING) {
      throw new BootstrapValidationError('Bootstrap is already starting or running.');
    }

    this.transitionTo(BootstrapState.STARTING);
    try {
      await this._startupManager.startup(context, timeoutMs);
      this.transitionTo(BootstrapState.RUNNING);
    } catch (err: unknown) {
      this.transitionTo(BootstrapState.FAILED);
      throw err;
    }
  }

  public async stop(context: BootstrapExecutionContext): Promise<void> {
    if (this._state === BootstrapState.STOPPING || this._state === BootstrapState.STOPPED) {
      return;
    }

    this.transitionTo(BootstrapState.STOPPING);
    try {
      await this._shutdownManager.shutdown(context);
      this.transitionTo(BootstrapState.STOPPED);
    } catch (err: unknown) {
      this.transitionTo(BootstrapState.FAILED);
      throw err;
    }
  }
}
