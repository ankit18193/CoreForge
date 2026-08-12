import {
  ActionArguments,
  ActionContext,
  HttpRequest,
  RequestBinder as IRequestBinder,
} from '@coreforge/contracts';

import { BindingConfiguration } from './BindingConfiguration';
import { BindingCoordinator } from '../coordinator/BindingCoordinator';
import { BindingDiagnostics, BindingDiagnosticsSnapshot } from '../diagnostics/BindingDiagnostics';
import { BindingExecutionError } from '../errors/BindingErrors';
import { BindingLifecycleManager } from '../lifecycle/BindingLifecycleManager';
import { BindingState } from '../lifecycle/BindingState';
import { BindingSource } from '../registry/BindingSource';
import { Validator } from '../validator/Validator';

export class RequestBinder implements IRequestBinder {
  private readonly _config: BindingConfiguration;
  private readonly _lifecycle = new BindingLifecycleManager();
  private readonly _diagnostics = new BindingDiagnostics();
  private readonly _coordinator: BindingCoordinator;

  constructor(
    config: BindingConfiguration,
    customExtractors?: ReadonlyMap<unknown, { extract(request: HttpRequest, name: string): unknown }>,
  ) {
    this._config = config;
    const validator = new Validator(config.validationPipeline);
    this._coordinator = new BindingCoordinator(
      config.typeConverter,
      validator,
      this._diagnostics,
    );

    if (customExtractors) {
      for (const [source, extractor] of customExtractors.entries()) {
        this._coordinator.registerExtractor(source as BindingSource, extractor);
      }
    }

    this._lifecycle.transitionTo(BindingState.READY);
  }

  public get state(): BindingState {
    return this._lifecycle.state;
  }

  public get diagnostics(): BindingDiagnosticsSnapshot {
    return this._diagnostics.getSnapshot();
  }

  public async bind(context: ActionContext): Promise<ActionArguments> {
    if (this._lifecycle.state === BindingState.STOPPED) {
      throw new BindingExecutionError('Cannot perform request binding when binder is stopped.');
    }

    if (this._lifecycle.state === BindingState.READY) {
      this._lifecycle.transitionTo(BindingState.RUNNING);
    }

    const ctxRecord = context as unknown as Record<string, unknown>;
    const request = ctxRecord.request as HttpRequest;

    const ctrlDesc = ctxRecord.controllerDescriptor as { id: string } | undefined;
    const actionDesc = ctxRecord.actionDescriptor as
      | { metadata: { actionName: string } }
      | undefined;

    if (!ctrlDesc || !actionDesc) {
      throw new BindingExecutionError(
        'Controller or action descriptor is missing in ActionContext.',
      );
    }

    const binding = this._config.registry.get(ctrlDesc.id, actionDesc.metadata.actionName);
    if (!binding) {
      return { positionals: [], named: {}, rawValues: {} };
    }

    try {
      const args = await this._coordinator.execute(request, binding.parameters);
      return args;
    } finally {
      if (this._lifecycle.state === BindingState.RUNNING) {
        this._lifecycle.transitionTo(BindingState.READY);
      }
    }
  }

  public stop(): void {
    if (
      this._lifecycle.state === BindingState.READY ||
      this._lifecycle.state === BindingState.RUNNING
    ) {
      this._lifecycle.transitionTo(BindingState.STOPPED);
    }
  }
}
