import { TraceLimitError, TracingConfigurationError } from '../errors/TracingErrors';
import { TraceLimitsConfig } from '../types/tracingTypes';

export class TraceLimitsManager {
  private readonly _maxAttributesPerSpan: number;
  private readonly _maxEventsPerSpan: number;
  private readonly _maxLinksPerSpan: number;
  private readonly _maxAttributeValueLength: number;

  constructor(config: TraceLimitsConfig = {}) {
    const maxAttributes = config.maxAttributesPerSpan ?? 128;
    const maxEvents = config.maxEventsPerSpan ?? 128;
    const maxLinks = config.maxLinksPerSpan ?? 128;
    const maxValueLength = config.maxAttributeValueLength ?? 1024;

    if (maxAttributes <= 0 || !Number.isFinite(maxAttributes)) {
      throw new TracingConfigurationError('maxAttributesPerSpan must be a positive integer', {
        maxAttributesPerSpan: maxAttributes,
      });
    }
    if (maxEvents <= 0 || !Number.isFinite(maxEvents)) {
      throw new TracingConfigurationError('maxEventsPerSpan must be a positive integer', {
        maxEventsPerSpan: maxEvents,
      });
    }
    if (maxLinks <= 0 || !Number.isFinite(maxLinks)) {
      throw new TracingConfigurationError('maxLinksPerSpan must be a positive integer', {
        maxLinksPerSpan: maxLinks,
      });
    }
    if (maxValueLength <= 0 || !Number.isFinite(maxValueLength)) {
      throw new TracingConfigurationError('maxAttributeValueLength must be a positive integer', {
        maxAttributeValueLength: maxValueLength,
      });
    }

    this._maxAttributesPerSpan = Math.floor(maxAttributes);
    this._maxEventsPerSpan = Math.floor(maxEvents);
    this._maxLinksPerSpan = Math.floor(maxLinks);
    this._maxAttributeValueLength = Math.floor(maxValueLength);
  }

  public get maxAttributesPerSpan(): number {
    return this._maxAttributesPerSpan;
  }

  public get maxEventsPerSpan(): number {
    return this._maxEventsPerSpan;
  }

  public get maxLinksPerSpan(): number {
    return this._maxLinksPerSpan;
  }

  public get maxAttributeValueLength(): number {
    return this._maxAttributeValueLength;
  }

  public assertAttributeLimit(currentCount: number): void {
    if (currentCount >= this._maxAttributesPerSpan) {
      throw new TraceLimitError(
        `Attribute limit (${this._maxAttributesPerSpan}) reached for span`,
        { maxAttributesPerSpan: this._maxAttributesPerSpan, currentCount },
      );
    }
  }

  public assertEventLimit(currentCount: number): void {
    if (currentCount >= this._maxEventsPerSpan) {
      throw new TraceLimitError(`Event limit (${this._maxEventsPerSpan}) reached for span`, {
        maxEventsPerSpan: this._maxEventsPerSpan,
        currentCount,
      });
    }
  }

  public assertLinkLimit(currentCount: number): void {
    if (currentCount >= this._maxLinksPerSpan) {
      throw new TraceLimitError(`Link limit (${this._maxLinksPerSpan}) reached for span`, {
        maxLinksPerSpan: this._maxLinksPerSpan,
        currentCount,
      });
    }
  }

  public sanitizeAndTruncateValue(value: unknown): unknown {
    if (typeof value === 'string') {
      if (value.length > this._maxAttributeValueLength) {
        return value.slice(0, this._maxAttributeValueLength) + '...';
      }
      return value;
    }
    return value;
  }
}
