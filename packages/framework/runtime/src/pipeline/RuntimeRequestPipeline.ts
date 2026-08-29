import { NormalizedRequest } from '@coreforge/contracts';
import { ErrorResponseMapper, ExceptionContext } from '@coreforge/exceptions';

import { DefaultTransportRequestNormalizer } from './DefaultTransportRequestNormalizer';
import { RuntimeDiagnostics } from '../diagnostics/RuntimeDiagnostics';
import { RuntimeProfiler } from '../internal/RuntimeProfiler';
import { RuntimeLifecycleManager } from '../lifecycle/RuntimeLifecycleManager';
import { RuntimeComponentRegistry } from '../registry/RuntimeComponentRegistry';
import { RuntimePipelineResult } from '../types/runtimeTypes';

export class RuntimeRequestPipeline {
  private readonly _registry: RuntimeComponentRegistry;
  private readonly _lifecycle: RuntimeLifecycleManager;
  private readonly _diagnostics: RuntimeDiagnostics;
  private readonly _enableDiagnostics: boolean;

  constructor(
    registry: RuntimeComponentRegistry,
    lifecycle: RuntimeLifecycleManager,
    diagnostics: RuntimeDiagnostics,
    enableDiagnostics = true,
  ) {
    this._registry = registry;
    this._lifecycle = lifecycle;
    this._diagnostics = diagnostics;
    this._enableDiagnostics = enableDiagnostics;
  }

  public async handle(
    rawRequest: unknown,
    nativeResponse?: unknown,
    writer?: unknown,
  ): Promise<RuntimePipelineResult> {
    this._lifecycle.acquireRequest();
    const profiler = new RuntimeProfiler();
    let isSuccess = false;
    let finalStatus = 500;
    let matchedRouteId: string | undefined;
    let correlationId: string | undefined;

    try {
      const components = this._registry.snapshot();
      const normalizer = new DefaultTransportRequestNormalizer();
      let normalizedRequest: NormalizedRequest;

      try {
        normalizedRequest = normalizer.normalize(rawRequest);
      } catch (normErr) {
        this._diagnostics.recordTransportFailure();
        throw normErr;
      }

      const headers = normalizedRequest.headers || {};
      correlationId =
        (typeof headers['x-correlation-id'] === 'string'
          ? headers['x-correlation-id']
          : undefined) ||
        (typeof headers['x-request-id'] === 'string' ? headers['x-request-id'] : undefined);

      // 1. Route Matching
      let routedRequest: NormalizedRequest = normalizedRequest;
      let action = (
        normalizedRequest as unknown as { action?: import('@coreforge/contracts').ActionDescriptor }
      ).action;

      if (components.routeMatcher) {
        try {
          const routeMatch = components.routeMatcher.match(normalizedRequest);
          matchedRouteId = routeMatch.route.id;
          action = routeMatch.route.action;
          routedRequest = Object.freeze({
            ...normalizedRequest,
            params: routeMatch.params,
          });
        } catch (routeErr) {
          this._diagnostics.recordRoutingFailure();
          throw routeErr;
        }
      }

      if (!action) {
        throw new Error('No action descriptor could be resolved for the request.');
      }

      // 2. Delegate to TransportPipeline (which coordinates RequestContext, ExecutionEngine, and ResponseProcessor)
      if (!components.transportPipeline) {
        throw new Error('TransportPipeline is not initialized in RuntimeComponentRegistry.');
      }

      const transportResult = await components.transportPipeline.execute(
        action,
        routedRequest,
        nativeResponse,
        writer as
          | {
              write(
                res: unknown,
                desc: import('@coreforge/contracts').ResponseDescriptor,
              ): void | Promise<void>;
            }
          | undefined,
      );

      finalStatus = transportResult.descriptor.status;
      isSuccess = transportResult.success;

      const durationMs = profiler.stop();
      if (this._enableDiagnostics) {
        if (isSuccess) {
          this._diagnostics.recordRequestSuccess(durationMs);
        } else {
          this._diagnostics.recordRequestFailure(durationMs);
        }
      }

      return Object.freeze({
        status: finalStatus,
        success: isSuccess,
        responseDescriptor: transportResult.descriptor,
        errorDescriptor: undefined,
        durationMs,
        routeId: matchedRouteId,
        correlationId,
      });
    } catch (pipelineErr) {
      // 3. Fallback error handling for errors outside TransportPipeline.execute (e.g. routing or normalization)
      const components = this._registry.snapshot();
      let errorDesc: import('@coreforge/contracts').ErrorDescriptor | undefined;
      let responseDesc: import('@coreforge/contracts').ResponseDescriptor | undefined;

      if (components.exceptionPipeline) {
        const dummyContext = {
          requestContext: null as unknown as import('@coreforge/contracts').RequestContext,
          error: pipelineErr,
          get: () => undefined,
          set: () => {},
        };

        errorDesc = await components.exceptionPipeline.handle(
          pipelineErr,
          dummyContext as unknown as ExceptionContext,
        );
        responseDesc = ErrorResponseMapper.map(errorDesc);
        finalStatus = responseDesc.status;
      }

      // Attempt to write response to native response writer if provided
      if (writer && nativeResponse && responseDesc) {
        try {
          const typedWriter = writer as {
            write(
              res: unknown,
              desc: import('@coreforge/contracts').ResponseDescriptor,
            ): void | Promise<void>;
          };
          await Promise.resolve(typedWriter.write(nativeResponse, responseDesc));
        } catch {
          this._diagnostics.recordTransportFailure();
        }
      }

      const durationMs = profiler.stop();
      if (this._enableDiagnostics) {
        this._diagnostics.recordRequestFailure(durationMs);
      }

      return Object.freeze({
        status: finalStatus,
        success: false,
        responseDescriptor: responseDesc,
        errorDescriptor: errorDesc,
        durationMs,
        routeId: matchedRouteId,
        correlationId,
      });
    } finally {
      this._lifecycle.releaseRequest();
    }
  }
}
