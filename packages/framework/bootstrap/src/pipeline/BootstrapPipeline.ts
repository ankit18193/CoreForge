import { BootstrapExecutionContext } from './BootstrapExecutionContext';
import { BootstrapStage } from './BootstrapStage';

export interface PipelineStageHook {
  execute(context: BootstrapExecutionContext): Promise<void> | void;
}

export class BootstrapPipeline {
  private readonly _stages = new Map<string, PipelineStageHook>();
  private readonly _stageOrder: string[] = [];

  constructor() {
    const builtInStages = [
      BootstrapStage.ENVIRONMENT,
      BootstrapStage.CONFIGURATION,
      BootstrapStage.LOGGER,
      BootstrapStage.EXCEPTION_HANDLER,
      BootstrapStage.CONTAINER,
      BootstrapStage.EVENT_BUS,
      BootstrapStage.MODULE_REGISTRATION,
      BootstrapStage.DEPENDENCY_VALIDATION,
      BootstrapStage.MODULE_STARTUP,
      BootstrapStage.RUNTIME_READY,
    ];

    for (const stage of builtInStages) {
      this._stageOrder.push(stage);
    }
  }

  public registerStage(
    name: string,
    hook: PipelineStageHook,
    options?: { before?: string; after?: string } | undefined,
  ): void {
    this._stages.set(name, hook);

    if (this._stageOrder.includes(name)) {
      return;
    }

    if (options?.before) {
      const idx = this._stageOrder.indexOf(options.before);
      if (idx !== -1) {
        this._stageOrder.splice(idx, 0, name);
        return;
      }
    } else if (options?.after) {
      const idx = this._stageOrder.indexOf(options.after);
      if (idx !== -1) {
        this._stageOrder.splice(idx + 1, 0, name);
        return;
      }
    }

    this._stageOrder.push(name);
  }

  public getStages(): readonly string[] {
    return Object.freeze([...this._stageOrder]);
  }

  public async execute(context: BootstrapExecutionContext): Promise<void> {
    for (const name of this._stageOrder) {
      const hook = this._stages.get(name);
      if (hook) {
        context.profiler.startStage(name);
        try {
          await hook.execute(context);
          context.profiler.endStage(name, true);
        } catch (err: unknown) {
          context.profiler.endStage(name, false);
          throw err;
        }
      }
    }
  }
}
