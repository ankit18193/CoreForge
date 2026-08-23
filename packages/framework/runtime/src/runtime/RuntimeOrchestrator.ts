import { RuntimeOrchestrator as IRuntimeOrchestrator } from '@coreforge/contracts';

import { ApplicationBootstrap } from '../bootstrap/ApplicationBootstrap';
import { RuntimeDiagnostics } from '../diagnostics/RuntimeDiagnostics';
import { RuntimeStateError } from '../errors/RuntimeErrors';
import { RuntimeLifecycleManager } from '../lifecycle/RuntimeLifecycleManager';
import { RuntimeRequestPipeline } from '../pipeline/RuntimeRequestPipeline';
import { RuntimeComponentRegistry } from '../registry/RuntimeComponentRegistry';
import { ShutdownCoordinator } from '../shutdown/ShutdownCoordinator';
import {
  RuntimeApplication,
  RuntimeDiagnosticsSnapshot,
  RuntimeOptions,
  RuntimePipelineResult,
  RuntimeSnapshot,
  RuntimeState,
} from '../types/runtimeTypes';

export class RuntimeOrchestrator implements IRuntimeOrchestrator, RuntimeApplication {
  private readonly _registry: RuntimeComponentRegistry;
  private readonly _lifecycle: RuntimeLifecycleManager;
  private readonly _diagnostics: RuntimeDiagnostics;
  private readonly _pipeline: RuntimeRequestPipeline;
  private readonly _options: RuntimeOptions;

  constructor(
    registry: RuntimeComponentRegistry = new RuntimeComponentRegistry(),
    options: RuntimeOptions = {},
  ) {
    this._registry = registry;
    this._options = options;
    this._lifecycle = new RuntimeLifecycleManager();
    this._diagnostics = new RuntimeDiagnostics();
    this._pipeline = new RuntimeRequestPipeline(
      this._registry,
      this._lifecycle,
      this._diagnostics,
      options.enableDiagnostics ?? true,
    );
  }

  public get registry(): RuntimeComponentRegistry {
    return this._registry;
  }

  public get lifecycle(): RuntimeLifecycleManager {
    return this._lifecycle;
  }

  public get state(): RuntimeState {
    return this._lifecycle.state;
  }

  public get ready(): boolean {
    return this._lifecycle.ready;
  }

  public get snapshot(): RuntimeSnapshot {
    return Object.freeze({
      state: this._lifecycle.state,
      startedAt: this._lifecycle.startedAt,
      stoppedAt: this._lifecycle.stoppedAt,
      activeRequests: this._lifecycle.activeRequests,
      ready: this._lifecycle.ready,
    });
  }

  public get diagnostics(): RuntimeDiagnosticsSnapshot {
    return this._diagnostics.getSnapshot(
      this._lifecycle.state,
      this._lifecycle.activeRequests,
      this._lifecycle.startedAt,
      this._lifecycle.stoppedAt,
    );
  }

  public async start(): Promise<void> {
    // Idempotent: starting when already ready or running is a safe no-op
    if (this._lifecycle.ready) {
      return;
    }

    if (this._lifecycle.state === 'STOPPED') {
      throw new RuntimeStateError(
        'Cannot start runtime application that has already been STOPPED.',
      );
    }

    if (this._lifecycle.state === 'STOPPING') {
      throw new RuntimeStateError('Cannot start runtime application while it is STOPPING.');
    }

    const startNs = process.hrtime.bigint();

    try {
      await ApplicationBootstrap.bootstrap(this._registry, this._lifecycle, {
        failFast: this._options.failFast,
      });

      const elapsedMs = Number(process.hrtime.bigint() - startNs) / 1_000_000;
      this._diagnostics.recordStartupSuccess(elapsedMs);
    } catch (startErr) {
      this._diagnostics.recordStartupFailure();
      throw startErr;
    }
  }

  public async handle(
    request: unknown,
    nativeResponse?: unknown,
    writer?: unknown,
  ): Promise<RuntimePipelineResult> {
    return this._pipeline.handle(request, nativeResponse, writer);
  }

  public async stop(): Promise<void> {
    // Idempotent: stopping when already stopped is a safe no-op
    if (this._lifecycle.state === 'STOPPED') {
      return;
    }

    const startNs = process.hrtime.bigint();

    await ShutdownCoordinator.executeShutdown(this._registry, this._lifecycle, {
      timeoutMs: this._options.shutdownTimeoutMs,
    });

    const elapsedMs = Number(process.hrtime.bigint() - startNs) / 1_000_000;
    this._diagnostics.recordShutdown(elapsedMs);
  }

  public status(): import('../types/runtimeTypes').RuntimeStatus {
    return {
      state: this._lifecycle.state,
      startedAt: this._lifecycle.startedAt || 0,
      stoppedAt: this._lifecycle.stoppedAt,
      processId: process.pid,
    };
  }
}
