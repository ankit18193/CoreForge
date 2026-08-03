import { Logger } from '@coreforge/contracts';

export class ProcessSignalManager {
  private _signalListeners: Map<string, NodeJS.SignalsListener> = new Map();
  private _logger: Logger | undefined;

  constructor(logger?: Logger) {
    this._logger = logger;
  }

  public register(signals: string[], handler: (signal: string) => Promise<void> | void): void {
    for (const signal of signals) {
      if (this._signalListeners.has(signal)) {
        continue;
      }

      const listener: NodeJS.SignalsListener = async (sig) => {
        if (this._logger) {
          this._logger.info(`Received signal ${sig}, triggering process termination handlers.`);
        }
        await handler(sig);
      };

      process.on(signal as NodeJS.Signals, listener);
      this._signalListeners.set(signal, listener);
    }
  }

  public unregister(): void {
    for (const [signal, listener] of this._signalListeners.entries()) {
      process.off(signal as NodeJS.Signals, listener);
    }
    this._signalListeners.clear();
  }
}
