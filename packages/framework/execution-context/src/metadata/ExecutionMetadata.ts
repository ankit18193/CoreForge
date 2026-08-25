import { MetadataSanitizer } from './MetadataSanitizer';
import { ExecutionLimitError } from '../errors/ExecutionContextErrors';

export class ExecutionMetadata {
  private readonly _sanitizer: MetadataSanitizer;

  constructor(sanitizer: MetadataSanitizer) {
    this._sanitizer = sanitizer;
  }

  public createSnapshot(
    metadata?: Readonly<Record<string, unknown>> | undefined,
  ): Readonly<Record<string, unknown>> {
    return this._sanitizer.sanitize(metadata);
  }

  public merge(
    parent: Readonly<Record<string, unknown>>,
    child?: Readonly<Record<string, unknown>> | undefined,
  ): Readonly<Record<string, unknown>> {
    if (!child || Object.keys(child).length === 0) {
      return parent;
    }

    const merged: Record<string, unknown> = { ...parent };
    const childSanitized = this._sanitizer.sanitize(child);

    for (const [k, v] of Object.entries(childSanitized)) {
      merged[k] = v;
    }

    if (Object.keys(merged).length > this._sanitizer.maxKeys) {
      throw new ExecutionLimitError(
        `Merged metadata exceeds maximum allowed keys (${this._sanitizer.maxKeys})`,
        { maxKeys: this._sanitizer.maxKeys, keyCount: Object.keys(merged).length },
      );
    }

    return Object.freeze(merged);
  }
}
