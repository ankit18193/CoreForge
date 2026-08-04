import { CoreForgeError } from '@coreforge/errors';

import { ExceptionCategory } from '../classifier/ExceptionCategory';

export class ExceptionResult {
  public readonly normalizedError: CoreForgeError;
  public readonly category: ExceptionCategory;
  public readonly filtered: boolean;
  public readonly reportersExecuted: readonly string[];
  public readonly processingTime: number;
  public readonly logged: boolean;

  constructor(params: {
    normalizedError: CoreForgeError;
    category: ExceptionCategory;
    filtered: boolean;
    reportersExecuted: string[];
    processingTime: number;
    logged: boolean;
  }) {
    this.normalizedError = params.normalizedError;
    this.category = params.category;
    this.filtered = params.filtered;
    this.reportersExecuted = Object.freeze([...params.reportersExecuted]);
    this.processingTime = params.processingTime;
    this.logged = params.logged;
    Object.freeze(this);
  }
}
