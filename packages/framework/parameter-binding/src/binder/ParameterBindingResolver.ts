import { ParameterBinder } from './ParameterBinder';
import { ParameterBindingDiagnostics } from '../diagnostics/ParameterBindingDiagnostics';
import { ParameterBindingError } from '../errors/ParameterBindingErrors';
import { ParameterBindingProfiler } from '../internal/ParameterBindingProfiler';
import { ParameterBindingLifecycleManager } from '../lifecycle/ParameterBindingLifecycleManager';
import { ParameterBindingState } from '../lifecycle/ParameterBindingState';
import {
  NormalizedRequest,
  ParameterBindingDescriptor,
  ParameterBindingDiagnosticsSnapshot,
  ParameterBindingResolver as IParameterBindingResolver,
} from '../types/parameterBindingTypes';

export class ParameterBindingResolver implements IParameterBindingResolver {
  private readonly _binder = new ParameterBinder();
  private readonly _lifecycle = new ParameterBindingLifecycleManager();
  private readonly _diagnostics = new ParameterBindingDiagnostics();
  private readonly _enableDiagnostics: boolean;

  constructor(options: { enableDiagnostics?: boolean } = {}) {
    this._enableDiagnostics = options.enableDiagnostics ?? true;
    this._lifecycle.transitionTo(ParameterBindingState.READY);
  }

  public get state(): ParameterBindingState {
    return this._lifecycle.state;
  }

  public get diagnostics(): ParameterBindingDiagnosticsSnapshot {
    return this._diagnostics.snapshot();
  }

  public start(): void {
    this._lifecycle.transitionTo(ParameterBindingState.RUNNING);
  }

  public stop(): void {
    if (this._lifecycle.state !== ParameterBindingState.STOPPED) {
      this._lifecycle.transitionTo(ParameterBindingState.STOPPING);
      this._lifecycle.transitionTo(ParameterBindingState.STOPPED);
    }
  }

  public resolveArguments(
    descriptors: readonly ParameterBindingDescriptor[],
    request: unknown,
  ): unknown[] {
    this._lifecycle.assertCanBind();

    const profiler = new ParameterBindingProfiler();
    profiler.start();

    const normRequest: NormalizedRequest = (request || {}) as NormalizedRequest;

    if (!descriptors || descriptors.length === 0) {
      const duration = profiler.stop();
      if (this._enableDiagnostics) {
        this._diagnostics.recordBindingSuccess(duration);
      }
      return [];
    }

    // Sort by parameterIndex
    const sorted = [...descriptors].sort((a, b) => a.parameterIndex - b.parameterIndex);

    const maxIndex = sorted[sorted.length - 1].parameterIndex;
    const args: unknown[] = new Array(maxIndex + 1).fill(undefined);

    try {
      for (const desc of sorted) {
        const val = this._binder.bind(desc, normRequest);
        args[desc.parameterIndex] = val;
      }

      const duration = profiler.stop();
      if (this._enableDiagnostics) {
        this._diagnostics.recordBindingSuccess(duration);
      }

      return args;
    } catch (err) {
      const duration = profiler.stop();
      if (this._enableDiagnostics) {
        const isMissingReq =
          (err instanceof ParameterBindingError && err.code === 'CF-BINDING-MISSING-REQUIRED') ||
          (err instanceof Error &&
            (err.message.includes('missing') ||
              err.message.includes('required') ||
              err.message.includes('undefined')));
        this._diagnostics.recordBindingFailure(duration, isMissingReq);
      }
      throw err;
    }
  }
}
