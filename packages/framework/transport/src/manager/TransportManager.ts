import {
  TransportAdapter,
  TransportAdapterOptions,
  TransportCapability,
  TransportDiagnosticsSnapshot,
  TransportExecutionOptions,
  TransportManager as ITransportManager,
  TransportRequest,
  TransportResult,
  TransportState,
} from '@coreforge/contracts';
import { ExecutionContextManager } from '@coreforge/execution-context';
import { ApplicationIntegration } from '@coreforge/integration';

import { TransportDiagnostics } from '../diagnostics/TransportDiagnostics';
import { TransportExecutionCoordinator } from '../execution/TransportExecutionCoordinator';
import { TransportLifecycleManager } from '../lifecycle/TransportLifecycleManager';
import { TransportAdapterRegistry } from '../registry/TransportAdapterRegistry';
import { TransportAdapterResolver } from '../registry/TransportAdapterResolver';
import { TransportManagerOptions } from '../types/transportTypes';

export class TransportManager implements ITransportManager {
  private readonly _contextManager: ExecutionContextManager;
  private readonly _lifecycle: TransportLifecycleManager;
  private readonly _registry: TransportAdapterRegistry;
  private readonly _diagnostics: TransportDiagnostics;
  private readonly _coordinator: TransportExecutionCoordinator;
  private readonly _application?: ApplicationIntegration | undefined;

  constructor(options: TransportManagerOptions = {}) {
    this._contextManager = options.contextManager ?? new ExecutionContextManager();
    this._lifecycle = new TransportLifecycleManager();
    this._registry = new TransportAdapterRegistry();
    this._diagnostics = new TransportDiagnostics();
    this._application = options.application;

    this._coordinator = new TransportExecutionCoordinator(
      this._contextManager,
      this._lifecycle,
      this._registry,
      this._diagnostics,
      this._application,
      options.defaultTimeoutMs ?? 30000,
    );

    if (options.autoStart) {
      this.startSync();
    }
  }

  public get state(): TransportState {
    return this._lifecycle.state;
  }

  public get ready(): boolean {
    return this._lifecycle.isReady;
  }

  public get contextManager(): ExecutionContextManager {
    return this._contextManager;
  }

  public get registry(): TransportAdapterRegistry {
    return this._registry;
  }

  public get application(): ApplicationIntegration | undefined {
    return this._application;
  }

  public startSync(): void {
    this._lifecycle.start();
    this._registry.lock();
  }

  public async start(): Promise<void> {
    this.startSync();
  }

  public async stop(timeoutMs = 5000): Promise<void> {
    await this._lifecycle.stop(timeoutMs);
  }

  public registerAdapter<TRequest = unknown, TResponse = unknown>(
    adapter: TransportAdapter<TRequest, TResponse>,
    options?: TransportAdapterOptions,
  ): void {
    try {
      this._lifecycle.ensureCanRegister();
      this._registry.register(adapter, options);
      this._diagnostics.recordAdapterRegistration();
    } catch (err: unknown) {
      this._diagnostics.recordRegistrationFailure();
      throw err;
    }
  }

  public resolveAdapter<TRequest = unknown, TResponse = unknown>(
    id: string,
  ): TransportAdapter<TRequest, TResponse> {
    return TransportAdapterResolver.resolve<TRequest, TResponse>(this._registry, id);
  }

  public resolveByCapability(
    capability: TransportCapability,
  ): readonly TransportAdapter<unknown, unknown>[] {
    return TransportAdapterResolver.resolveByCapability(this._registry, capability);
  }

  public async execute<TRequest = unknown, TResponse = unknown>(
    request: TransportRequest<TRequest>,
    options?: TransportExecutionOptions,
  ): Promise<TransportResult<TResponse>> {
    return this._coordinator.execute<TRequest, TResponse>(request, options);
  }

  public getDiagnostics(): TransportDiagnosticsSnapshot {
    return this._diagnostics.getSnapshot();
  }

  public resetDiagnostics(): void {
    this._diagnostics.reset();
  }
}
