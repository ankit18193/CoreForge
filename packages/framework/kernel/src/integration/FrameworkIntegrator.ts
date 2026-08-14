import { IntegrationContext } from './IntegrationContext';
import { KernelDiagnostics } from '../diagnostics/KernelDiagnostics';
import { KernelProfiler } from '../internal/KernelProfiler';

export class FrameworkIntegrator {
  private readonly _context: IntegrationContext;
  private readonly _diagnostics: KernelDiagnostics;

  constructor(context: IntegrationContext, diagnostics: KernelDiagnostics) {
    this._context = context;
    this._diagnostics = diagnostics;
  }

  public integrate(subsystems: Record<string, unknown>): void {
    const profiler = new KernelProfiler();
    profiler.start();

    let count = 0;
    for (const [name, subsystem] of Object.entries(subsystems)) {
      this._context.registry.register(name, subsystem);
      count++;
    }

    this._diagnostics.recordIntegration(profiler.durationMs, count);
  }
}
