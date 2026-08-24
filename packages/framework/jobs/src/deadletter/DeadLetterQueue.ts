import { DeadLetterEntry } from '../types/jobTypes';

export class DeadLetterQueue {
  private readonly _entries = new Map<string, DeadLetterEntry>();

  public add(entry: DeadLetterEntry): void {
    this._entries.set(entry.jobId, Object.freeze({ ...entry }));
  }

  public get(jobId: string): DeadLetterEntry | undefined {
    return this._entries.get(jobId);
  }

  public list(): readonly DeadLetterEntry[] {
    return Array.from(this._entries.values());
  }

  public get size(): number {
    return this._entries.size;
  }

  public clear(): void {
    this._entries.clear();
  }
}
