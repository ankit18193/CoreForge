import { IntegrationContext } from './IntegrationContext';
import { KernelDiagnostics } from '../diagnostics/KernelDiagnostics';
import { KernelSnapshotBuilder } from '../kernel/KernelSnapshotBuilder';
import { KernelLifecycleManager } from '../lifecycle/KernelLifecycleManager';
import { KernelState } from '../lifecycle/KernelState';
import { KernelSnapshot } from '../registry/KernelSnapshot';

export class KernelFinalizer {
  private readonly _context: IntegrationContext;
  private readonly _lifecycle: KernelLifecycleManager;
  private readonly _diagnostics: KernelDiagnostics;

  constructor(
    context: IntegrationContext,
    lifecycle: KernelLifecycleManager,
    diagnostics: KernelDiagnostics,
  ) {
    this._context = context;
    this._lifecycle = lifecycle;
    this._diagnostics = diagnostics;
  }

  public finalize(): KernelSnapshot {
    this._lifecycle.transitionTo(KernelState.READY);
    this._diagnostics.recordTransition();

    this._context.registry.makeReadOnly();

    this._diagnostics.recordRegistration(
      this._context.registry.getAll().length,
    );

    const builder = new KernelSnapshotBuilder();
    return builder.build(this._context.registry, this._diagnostics);
  }
}
