import { CoreForgeError } from '@coreforge/errors';

import { ExceptionFilter } from './ExceptionFilter';

export class FilterPipeline {
  private readonly _filters: ExceptionFilter[] = [];

  public addFilter(filter: ExceptionFilter): void {
    this._filters.push(filter);
  }

  public shouldHandle(error: CoreForgeError, executedFilters?: string[]): boolean {
    for (const filter of this._filters) {
      if (executedFilters) {
        executedFilters.push(filter.name);
      }
      if (!filter.shouldHandle(error)) {
        return false;
      }
    }
    return true;
  }
}
