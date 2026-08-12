import { ConnectionDescriptor } from './ConnectionDescriptor';

export class ConnectionManager {
  private readonly _connections = new Map<string, ConnectionDescriptor>();
  private _peakConcurrentRequests = 0;
  private _totalRequests = 0;

  public connectionOpened(descriptor: ConnectionDescriptor): void {
    this._connections.set(descriptor.connectionId, descriptor);
    const active = this.activeConnections;
    if (active > this._peakConcurrentRequests) {
      this._peakConcurrentRequests = active;
    }
  }

  public connectionClosed(connectionId: string): void {
    const conn = this._connections.get(connectionId);
    if (conn) {
      this._connections.set(connectionId, {
        ...conn,
        state: 'CLOSED',
      });
    }
  }

  public updateActiveRequests(connectionId: string, delta: number): void {
    const conn = this._connections.get(connectionId);
    if (conn) {
      this._connections.set(connectionId, {
        ...conn,
        activeRequests: Math.max(0, conn.activeRequests + delta),
      });
    }
  }

  public requestReceived(): void {
    this._totalRequests++;
  }

  public get activeConnections(): number {
    let count = 0;
    for (const conn of this._connections.values()) {
      if (conn.state !== 'CLOSED') {
        count++;
      }
    }
    return count;
  }

  public get totalRequests(): number {
    return this._totalRequests;
  }

  public get peakConcurrentRequests(): number {
    return this._peakConcurrentRequests;
  }

  public getConnections(): readonly ConnectionDescriptor[] {
    return Object.freeze(Array.from(this._connections.values()));
  }

  public async gracefulClose(timeoutMs: number): Promise<void> {
    const start = Date.now();

    for (const [id, conn] of this._connections.entries()) {
      if (conn.state === 'OPEN') {
        this._connections.set(id, {
          ...conn,
          state: 'CLOSING',
        });
      }
    }

    while (this.activeConnections > 0) {
      if (Date.now() - start > timeoutMs) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }
}
