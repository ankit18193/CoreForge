import { ParameterBindingDiagnostics } from '../diagnostics/ParameterBindingDiagnostics';
import { ParameterBindingProfiler } from '../internal/ParameterBindingProfiler';

export class ParameterBindingContext {
  public readonly profiler: ParameterBindingProfiler = new ParameterBindingProfiler();
  public readonly diagnostics?: ParameterBindingDiagnostics | undefined;

  constructor(diagnostics?: ParameterBindingDiagnostics) {
    this.diagnostics = diagnostics;
  }
}
