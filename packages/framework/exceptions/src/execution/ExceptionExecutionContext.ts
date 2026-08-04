import { CoreForgeError } from '@coreforge/errors';

import { ExceptionCategory } from '../classifier/ExceptionCategory';

export class ExceptionExecutionContext {
  public readonly startTime: number;
  public endTime?: number | undefined;
  public duration?: number | undefined;
  public classification?: ExceptionCategory | undefined;
  public readonly reportersExecuted: string[] = [];
  public readonly filtersExecuted: string[] = [];
  public normalized?: CoreForgeError | undefined;

  constructor() {
    this.startTime = Date.now();
  }

  public complete(category: ExceptionCategory, normalized: CoreForgeError): void {
    this.endTime = Date.now();
    this.duration = this.endTime - this.startTime;
    this.classification = category;
    this.normalized = normalized;
  }
}
