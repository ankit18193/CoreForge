import type { HttpBindingContext, HttpBindingResult } from '@coreforge/contracts';

import { HttpBindingPlan } from './HttpBindingPlan';
import { HttpBindingResolver } from './HttpBindingResolver';
import { HttpBindingSnapshot } from './HttpBindingSnapshot';
import { HttpBindingDiagnostics } from '../diagnostics/HttpBindingDiagnostics';
import { HttpBindingProfiler } from '../internal/HttpBindingProfiler';
import { HttpValidationEngine } from '../validation/HttpValidationEngine';

export class HttpBindingExecutor {
  private readonly _resolver: HttpBindingResolver;
  private readonly _diagnostics: HttpBindingDiagnostics;

  constructor(resolver?: HttpBindingResolver, diagnostics?: HttpBindingDiagnostics) {
    this._resolver = resolver ?? new HttpBindingResolver();
    this._diagnostics = diagnostics ?? new HttpBindingDiagnostics();
  }

  public get diagnostics(): HttpBindingDiagnostics {
    return this._diagnostics;
  }

  public execute<T = Record<string, unknown>>(
    plan: HttpBindingPlan,
    context: HttpBindingContext,
  ): HttpBindingResult<T> {
    const profiler = new HttpBindingProfiler().start();
    this._diagnostics.recordBindingStarted();

    // Check cancellation
    if (context.executionContext?.signal?.aborted) {
      const durationMs = profiler.stop();
      this._diagnostics.recordBindingFailure(durationMs, [
        {
          field: 'context',
          code: 'OPERATION_CANCELLED',
          message: 'Binding was cancelled via AbortSignal',
        },
      ]);
      return HttpBindingSnapshot.createResult<T>(false, durationMs, undefined, [
        {
          field: 'context',
          code: 'OPERATION_CANCELLED',
          message: 'Binding was cancelled via AbortSignal',
        },
      ]);
    }

    const rawValues = this._resolver.extractValues(plan, context);
    const result = HttpValidationEngine.validatePlan(plan, rawValues);
    const durationMs = profiler.stop();

    if (result.success) {
      this._diagnostics.recordBindingSuccess(durationMs);
    } else {
      this._diagnostics.recordBindingFailure(durationMs, result.errors);
    }

    return HttpBindingSnapshot.createResult<T>(
      result.success,
      durationMs,
      result.value as unknown as T,
      result.errors,
    );
  }
}
