import { KernelDiagnostics } from '../diagnostics/KernelDiagnostics';
import { KernelRegistry } from '../registry/KernelRegistry';
import { KernelSnapshot } from '../registry/KernelSnapshot';

export class KernelSnapshotBuilder {
  public build(registry: KernelRegistry, diagnostics: KernelDiagnostics): KernelSnapshot {
    const snap = {
      version: '1.0.0',
      initialized: true,
      startupTimestamp: Date.now(),
      subsystemCount: registry.getAll().length,
      diagnostics: diagnostics.getSnapshot(),
    };

    Object.freeze(snap.diagnostics);
    Object.freeze(snap);

    return snap as unknown as KernelSnapshot;
  }
}
