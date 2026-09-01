import type { HttpSerializationContext, HttpSerializer } from '@coreforge/contracts';

import { HttpSerializationExecutionError } from '../../errors/HttpSerializationErrors';

export class HttpJsonSerializer implements HttpSerializer<unknown, string | undefined> {
  public readonly id: string;
  public readonly name: string;
  public readonly priority: number;
  public readonly mediaTypes: readonly string[];

  constructor(options: { id?: string; name?: string; priority?: number } = {}) {
    this.id = options.id ?? 'json';
    this.name = options.name ?? 'HttpJsonSerializer';
    this.priority = options.priority ?? 0;
    this.mediaTypes = Object.freeze(['application/json']);
  }

  public serialize(value: unknown, _context?: HttpSerializationContext): string | undefined {
    if (value === undefined) {
      return undefined;
    }

    try {
      return JSON.stringify(value);
    } catch (err: unknown) {
      throw new HttpSerializationExecutionError(
        `JSON serialization failed: ${err instanceof Error ? err.message : String(err)}`,
        this.id,
        err instanceof Error ? err : undefined,
      );
    }
  }
}
