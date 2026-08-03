import { CoreForgeError } from '@coreforge/errors';

export enum PipelinePhase {
  LOAD_ENVIRONMENT = 'LOAD_ENVIRONMENT',
  LOAD_CONFIGURATION = 'LOAD_CONFIGURATION',
  INITIALIZE_LOGGER = 'INITIALIZE_LOGGER',
  ASSEMBLE_CONTAINER = 'ASSEMBLE_CONTAINER',
  START_EVENT_BUS = 'START_EVENT_BUS',
  DISCOVER_MODULES = 'DISCOVER_MODULES',
  REGISTER_MODULES = 'REGISTER_MODULES',
  CONFIGURE_MODULES = 'CONFIGURE_MODULES',
  INITIALIZE_MODULES = 'INITIALIZE_MODULES',
  APPLICATION_READY = 'APPLICATION_READY',
}

export type PhaseCallback = () => Promise<void> | void;

export class BootstrapPipeline {
  private _callbacks: Map<PipelinePhase, PhaseCallback[]> = new Map();

  constructor() {
    for (const phase of Object.values(PipelinePhase)) {
      this._callbacks.set(phase, []);
    }
  }

  public registerHook(phase: PipelinePhase, callback: PhaseCallback): void {
    const list = this._callbacks.get(phase);
    if (!list) {
      throw new CoreForgeError(
        `Failed to register hook: phase ${phase} is not defined in the bootstrap pipeline.`,
        'INVALID_PIPELINE_PHASE',
      );
    }
    list.push(callback);
  }

  public async execute(): Promise<void> {
    for (const phase of Object.values(PipelinePhase)) {
      const callbacks = this._callbacks.get(phase) || [];
      for (const callback of callbacks) {
        try {
          await callback();
        } catch (error: unknown) {
          const originalError = error instanceof Error ? error : new Error(String(error));
          throw new CoreForgeError(
            `Pipeline phase ${phase} failed during hook execution: ${originalError.message}`,
            'BOOTSTRAP_PHASE_FAILED',
            originalError,
          );
        }
      }
    }
  }
}
