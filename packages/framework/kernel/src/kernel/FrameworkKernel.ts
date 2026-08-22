import { FrameworkKernel as IFrameworkKernel } from '@coreforge/contracts';

import { KernelConfiguration } from './KernelConfiguration';
import { KernelDiagnostics } from '../diagnostics/KernelDiagnostics';
import { KernelInitializationError, KernelStateError } from '../errors/KernelErrors';
import { FrameworkIntegrator } from '../integration/FrameworkIntegrator';
import { IntegrationContext } from '../integration/IntegrationContext';
import { KernelFinalizer } from '../integration/KernelFinalizer';
import { KernelProfiler } from '../internal/KernelProfiler';
import { KernelLifecycleManager } from '../lifecycle/KernelLifecycleManager';
import { KernelState } from '../lifecycle/KernelState';
import { KernelRegistry } from '../registry/KernelRegistry';
import { KernelSnapshot } from '../registry/KernelSnapshot';
import { KernelValidator } from '../validator/KernelValidator';

export class FrameworkKernel implements IFrameworkKernel {
  private readonly _config: KernelConfiguration;
  private readonly _lifecycle = new KernelLifecycleManager();
  private readonly _diagnostics = new KernelDiagnostics();
  private readonly _context = new IntegrationContext();

  constructor(config: KernelConfiguration) {
    this._config = config;
  }

  public get config(): KernelConfiguration {
    return this._config;
  }

  public get state(): KernelState {
    return this._lifecycle.state;
  }

  public get diagnostics(): KernelDiagnostics {
    return this._diagnostics;
  }

  public get registry(): KernelRegistry {
    return this._context.registry;
  }

  public async initialize(subsystems: Record<string, unknown> = {}): Promise<KernelSnapshot> {
    if (this._lifecycle.state !== KernelState.CREATED) {
      throw new KernelStateError(
        'FrameworkKernel: initialize() was rejected because the kernel is already initialized or initializing.',
      );
    }

    const initProfiler = new KernelProfiler();
    initProfiler.start();

    this._lifecycle.transitionTo(KernelState.BUILDING);
    this._diagnostics.recordTransition();

    const integrator = new FrameworkIntegrator(this._context, this._diagnostics);
    integrator.integrate(subsystems);

    this._lifecycle.transitionTo(KernelState.VALIDATING);
    this._diagnostics.recordTransition();

    const valProfiler = new KernelProfiler();
    valProfiler.start();
    const validator = new KernelValidator();

    try {
      validator.validate(this._context.registry);
      this._diagnostics.recordValidation(valProfiler.durationMs, true);
    } catch (err: unknown) {
      this._lifecycle.transitionTo(KernelState.FAILED);
      this._diagnostics.recordTransition();
      this._diagnostics.recordValidation(valProfiler.durationMs, false);

      const msg = err instanceof Error ? err.message : String(err);
      throw new KernelInitializationError(`FrameworkKernel: Validation failed: ${msg}`, {
        cause: err as Record<string, unknown>,
      });
    }

    const finalizer = new KernelFinalizer(this._context, this._lifecycle, this._diagnostics);
    const snapshot = finalizer.finalize();

    this._diagnostics.recordInitialization(initProfiler.durationMs);
    return snapshot;
  }
}
