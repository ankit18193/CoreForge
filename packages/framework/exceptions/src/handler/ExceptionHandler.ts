import { ExceptionContext, ExceptionHandler as IExceptionHandler } from '@coreforge/contracts';

import { ExceptionPipeline } from './ExceptionPipeline';

export class ExceptionHandler implements IExceptionHandler {
  private readonly _pipeline: ExceptionPipeline;

  constructor(pipeline: ExceptionPipeline) {
    this._pipeline = pipeline;
  }

  public get pipeline(): ExceptionPipeline {
    return this._pipeline;
  }

  public async handle(error: Error, context?: ExceptionContext): Promise<void> {
    await this._pipeline.run(error, context);
  }
}
