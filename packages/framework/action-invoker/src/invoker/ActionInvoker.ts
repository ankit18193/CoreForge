import {
  ActionArguments,
  ActionInvoker as IActionInvoker,
  Controller,
  InvocationResult as IInvocationResult,
  RequestScope,
} from '@coreforge/contracts';

import { ActionInvokerConfiguration } from './ActionInvokerConfiguration';
import { ActionInvokerDiagnostics } from '../diagnostics/ActionInvokerDiagnostics';
import { InvocationStatistics } from '../diagnostics/InvocationStatistics';
import { ActionExecutor } from '../executor/ActionExecutor';
import { InvocationContext } from '../executor/InvocationContext';
import { InvocationDescriptor } from '../executor/InvocationDescriptor';
import { InvocationProfiler } from '../internal/InvocationProfiler';
import { ActionInvokerLifecycleManager } from '../lifecycle/ActionInvokerLifecycleManager';
import { ActionInvokerState } from '../lifecycle/ActionInvokerState';
import { ActionDescriptorResolver } from '../resolver/ActionDescriptorResolver';
import { ControllerInstanceResolver } from '../resolver/ControllerInstanceResolver';
import { ResultNormalizer } from '../resolver/ResultNormalizer';

export class ActionInvoker implements IActionInvoker {
  private readonly _config: ActionInvokerConfiguration;
  private readonly _lifecycle = new ActionInvokerLifecycleManager();

  private readonly _controllerResolver: ControllerInstanceResolver;
  private readonly _actionResolver: ActionDescriptorResolver;
  private readonly _executor = new ActionExecutor();
  private readonly _normalizer = new ResultNormalizer();

  private readonly _stats = new InvocationStatistics();
  private readonly _diagnostics = new ActionInvokerDiagnostics(this._stats);

  constructor(config: ActionInvokerConfiguration) {
    this._config = config;

    this._controllerResolver = new ControllerInstanceResolver();
    this._actionResolver = new ActionDescriptorResolver(config.controllerRegistry);

    this._lifecycle.transitionTo(ActionInvokerState.INITIALIZED);
    this._lifecycle.transitionTo(ActionInvokerState.READY);
  }

  public get state(): ActionInvokerState {
    return this._lifecycle.state;
  }

  public get diagnostics(): ActionInvokerDiagnostics {
    return this._diagnostics;
  }

  public stop(): void {
    if (this._lifecycle.state === ActionInvokerState.STOPPED) {
      return;
    }
    this._lifecycle.transitionTo(ActionInvokerState.STOPPED);
  }

  public start(): void {
    if (this._lifecycle.state === ActionInvokerState.READY) {
      return;
    }
    this._lifecycle.transitionTo(ActionInvokerState.READY);
  }

  public async invoke(
    controller: Controller,
    action: string,
    argumentsVal: ActionArguments,
    scope: RequestScope,
  ): Promise<IInvocationResult> {
    const profiler = new InvocationProfiler();

    if (this._lifecycle.state !== ActionInvokerState.READY) {
      throw new Error(`ActionInvoker is not in READY state (current: ${this._lifecycle.state}).`);
    }

    const controllerName = controller.constructor.name;
    this._stats.recordInvocation(controllerName, action);

    try {
      const ctrlResStart = Date.now();
      const instance = this._controllerResolver.resolve(controller, scope);
      profiler.recordControllerResolution(Date.now() - ctrlResStart);

      const actionResStart = Date.now();
      const actionDesc = this._actionResolver.resolve(controller, action);
      profiler.recordActionResolution(Date.now() - actionResStart);

      const descriptor = new InvocationDescriptor({
        controllerDescriptor: this._config.controllerRegistry.getByName(controllerName)!,
        actionDescriptor: actionDesc,
        args: argumentsVal,
        scope,
      });

      // Assert type contextualization is correct
      new InvocationContext(descriptor, scope.id);

      const execStart = Date.now();
      const { value, durationMs } = await this._executor.execute(
        instance,
        actionDesc,
        argumentsVal,
      );
      profiler.recordExecution(Date.now() - execStart);

      const normStart = Date.now();
      const result = this._normalizer.normalize(value);
      profiler.recordNormalization(Date.now() - normStart);

      this._stats.recordSuccess(durationMs, controllerName, action);

      return result;
    } catch (err: unknown) {
      this._stats.recordFailure();
      this._lifecycle.transitionTo(ActionInvokerState.FAILED);
      throw err;
    }
  }
}
