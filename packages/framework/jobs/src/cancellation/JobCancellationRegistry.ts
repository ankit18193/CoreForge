export class JobCancellationRegistry {
  private readonly _activeControllers = new Map<string, AbortController>();
  private readonly _cancelledQueuedJobs = new Set<string>();

  public createController(jobId: string): AbortController {
    const controller = new AbortController();
    this._activeControllers.set(jobId, controller);
    return controller;
  }

  public getSignal(jobId: string): AbortSignal | undefined {
    return this._activeControllers.get(jobId)?.signal;
  }

  public isRunning(jobId: string): boolean {
    return this._activeControllers.has(jobId);
  }

  public cancel(jobId: string): boolean {
    const controller = this._activeControllers.get(jobId);
    if (controller) {
      controller.abort();
      return true;
    }

    this._cancelledQueuedJobs.add(jobId);
    return true;
  }

  public isCancelled(jobId: string): boolean {
    if (this._cancelledQueuedJobs.has(jobId)) {
      return true;
    }
    const controller = this._activeControllers.get(jobId);
    return controller?.signal.aborted ?? false;
  }

  public remove(jobId: string): void {
    this._activeControllers.delete(jobId);
    this._cancelledQueuedJobs.delete(jobId);
  }

  public clear(): void {
    for (const controller of this._activeControllers.values()) {
      controller.abort();
    }
    this._activeControllers.clear();
    this._cancelledQueuedJobs.clear();
  }
}
