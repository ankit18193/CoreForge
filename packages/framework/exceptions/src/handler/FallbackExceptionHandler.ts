import { ErrorNormalizer } from '../normalization/ErrorNormalizer';
import {
  ErrorDescriptor,
  ExceptionContext,
  ExceptionHandler,
  ExceptionPipelineOptions,
} from '../types/exceptionTypes';

export class FallbackExceptionHandler implements ExceptionHandler {
  public readonly priority = -Infinity;
  private readonly _options: ExceptionPipelineOptions;

  constructor(options: ExceptionPipelineOptions = {}) {
    this._options = options;
  }

  public canHandle(): boolean {
    return true;
  }

  public handle(error: unknown, _context: ExceptionContext): ErrorDescriptor {
    return ErrorNormalizer.normalize(error, this._options);
  }
}
