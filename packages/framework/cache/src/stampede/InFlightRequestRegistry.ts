export class InFlightRequestRegistry {
  private readonly _inFlight = new Map<string, Promise<unknown>>();

  public getOrExecute<T>(
    key: string,
    factory: () => Promise<T>,
  ): { promise: Promise<T>; isNew: boolean } {
    const existing = this._inFlight.get(key);
    if (existing) {
      return { promise: existing as Promise<T>, isNew: false };
    }

    const promise = (async () => {
      try {
        return await factory();
      } finally {
        this._inFlight.delete(key);
      }
    })();

    this._inFlight.set(key, promise);

    return { promise, isNew: true };
  }

  public has(key: string): boolean {
    return this._inFlight.has(key);
  }

  public clear(): void {
    this._inFlight.clear();
  }

  public get size(): number {
    return this._inFlight.size;
  }
}
