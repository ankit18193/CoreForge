import { Disposable } from './Disposable';
import { DisposalTimeoutError } from '../errors/ScopeErrors';

export class ScopeDisposer {
  private readonly _timeoutMs: number;

  constructor(timeoutMs = 5000) {
    this._timeoutMs = timeoutMs;
  }

  public async dispose(instances: unknown[]): Promise<void> {
    const reversed = [...instances].reverse();

    for (const inst of reversed) {
      if (inst && typeof inst === 'object' && 'dispose' in inst) {
        const disposable = inst as Disposable;

        let timerId: NodeJS.Timeout | undefined;
        try {
          const timeoutPromise = new Promise<void>((_, reject) => {
            timerId = setTimeout(() => {
              reject(
                new DisposalTimeoutError(
                  `ScopeDisposer: disposal of service timed out after ${this._timeoutMs}ms.`,
                ),
              );
            }, this._timeoutMs);
          });

          const disposePromise = Promise.resolve().then(() => disposable.dispose());
          disposePromise.catch(() => {});

          await Promise.race([disposePromise, timeoutPromise]);
        } finally {
          if (timerId !== undefined) {
            clearTimeout(timerId);
          }
        }
      }
    }
  }
}
