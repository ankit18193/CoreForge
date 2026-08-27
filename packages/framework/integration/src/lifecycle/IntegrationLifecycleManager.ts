import { IntegrationLifecycleError, IntegrationStateError } from '../errors/IntegrationErrors';
import { ApplicationInfrastructureGraph, IntegrationState } from '../types/integrationTypes';

export class IntegrationLifecycleManager {
  private _state: IntegrationState;
  private readonly _graph: ApplicationInfrastructureGraph;

  constructor(graph: ApplicationInfrastructureGraph, initialState: IntegrationState = 'CREATED') {
    this._graph = graph;
    this._state = initialState;
  }

  public get state(): IntegrationState {
    return this._state;
  }

  public get isReady(): boolean {
    return this._state === 'READY';
  }

  public get isStopped(): boolean {
    return this._state === 'STOPPED';
  }

  public async start(): Promise<void> {
    if (this._state === 'READY') {
      return; // Idempotent
    }

    if (this._state === 'INITIALIZING') {
      throw new IntegrationLifecycleError('Application integration is already initializing');
    }

    if (this._state === 'STOPPING' || this._state === 'STOPPED') {
      throw new IntegrationStateError(
        `Cannot start application integration from ${this._state} state`,
      );
    }

    this._state = 'INITIALIZING';

    try {
      // 1. Start HookManager
      await this._graph.hookManager.start();

      // 2. Start ApplicationKernel
      await this._graph.kernel.start();

      this._state = 'READY';
    } catch (err) {
      this._state = 'STOPPED';
      throw new IntegrationLifecycleError(
        `Application integration startup failed: ${err instanceof Error ? err.message : String(err)}`,
        err,
      );
    }
  }

  public async stop(): Promise<void> {
    if (this._state === 'STOPPED') {
      return; // Idempotent
    }

    if (this._state === 'STOPPING') {
      return; // Idempotent
    }

    this._state = 'STOPPING';

    try {
      // 1. Stop ApplicationKernel (drains in-flight operations & stops components)
      await this._graph.kernel.stop();

      // 2. Stop HookManager
      await this._graph.hookManager.stop();
    } finally {
      this._state = 'STOPPED';
    }
  }

  public ensureReadyForOperations(): void {
    if (this._state === 'STOPPING' || this._state === 'STOPPED') {
      throw new IntegrationStateError(
        `Cannot execute operation when application integration is in ${this._state} state`,
      );
    }

    if (this._state !== 'READY') {
      throw new IntegrationStateError(
        `Cannot execute operation before application integration is READY (current: ${this._state})`,
      );
    }
  }
}
