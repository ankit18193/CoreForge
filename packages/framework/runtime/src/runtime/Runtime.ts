import { Logger } from '@coreforge/contracts';
import { CoreForgeError } from '@coreforge/errors';

import { ProcessSignalManager } from '../internal/ProcessSignalManager';
import { RuntimeClock } from '../internal/RuntimeClock';
import { BootstrapPipeline } from '../lifecycle/BootstrapPipeline';
import { RuntimeState } from '../state/RuntimeState';
import { StateMachine } from '../state/StateMachine';
import { RuntimeOptions, RuntimeStatus } from '../types/runtimeTypes';

export class Runtime {
  private _stateMachine: StateMachine;
  private _pipeline: BootstrapPipeline;
  private _clock: RuntimeClock;
  private _signalManager: ProcessSignalManager;
  private _options: RuntimeOptions;
  private _logger: Logger | undefined;

  constructor(options: RuntimeOptions, logger?: Logger) {
    this._options = options;
    this._logger = logger;
    this._stateMachine = new StateMachine();
    this._pipeline = new BootstrapPipeline();
    this._clock = new RuntimeClock();
    this._signalManager = new ProcessSignalManager(logger);
  }

  public get state(): RuntimeState {
    return this._stateMachine.state;
  }

  public get pipeline(): BootstrapPipeline {
    return this._pipeline;
  }

  public async start(): Promise<void> {
    this._stateMachine.startTransition(RuntimeState.BOOTSTRAPPING);

    try {
      this._clock.start();

      // Trigger Bootstrapping Pipeline
      await this._pipeline.execute();
      this._stateMachine.endTransition(RuntimeState.BOOTSTRAPPING);

      // Transition to Starting
      this._stateMachine.startTransition(RuntimeState.STARTING);
      this._stateMachine.endTransition(RuntimeState.STARTING);

      // Transition to Running
      this._stateMachine.transitionTo(RuntimeState.RUNNING);

      // Register process signals if requested
      if (this._options.enableSignalHandlers) {
        this._signalManager.register(['SIGINT', 'SIGTERM'], async (signal) => {
          if (this._logger) {
            this._logger.info(`Received signal ${signal}, stopping runtime gracefully.`);
          }
          await this.stop();
        });
      }
    } catch (error: unknown) {
      this._stateMachine.failTransition();
      this._clock.reset();

      const originalError = error instanceof Error ? error : new Error(String(error));
      if (originalError instanceof CoreForgeError) {
        throw originalError;
      }
      throw new CoreForgeError(
        `Runtime startup failed: ${originalError.message}`,
        'RUNTIME_START_FAILED',
        originalError,
      );
    }
  }

  public async stop(): Promise<void> {
    if (this._stateMachine.state === RuntimeState.STOPPED) {
      return;
    }

    this._stateMachine.startTransition(RuntimeState.STOPPING);

    try {
      // Unregister signals
      this._signalManager.unregister();

      this._clock.reset();
      this._stateMachine.endTransition(RuntimeState.STOPPED);
    } catch (error: unknown) {
      this._stateMachine.failTransition();
      const originalError = error instanceof Error ? error : new Error(String(error));
      throw new CoreForgeError(
        `Runtime stop failed: ${originalError.message}`,
        'RUNTIME_STOP_FAILED',
        originalError,
      );
    }
  }

  public status(): RuntimeStatus {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const packageJsonPath = require.resolve('../../package.json');
    let frameworkVersion = '0.1.0';
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const packageJson = require(packageJsonPath);
      frameworkVersion = packageJson.version || '0.1.0';
    } catch {
      // Fallback
    }

    return {
      state: this._stateMachine.state as unknown as import('../types/runtimeTypes').RuntimeState,
      startedAt: this._clock.startedAt,
      uptime: this._clock.uptime,
      processId: process.pid,
      nodeVersion: process.version,
      frameworkVersion,
    };
  }
}
