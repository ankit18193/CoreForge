import { CoreForgeError } from '@coreforge/errors';

import { ExceptionReporter } from './ExceptionReporter';
import { ExceptionContext } from '../context/ExceptionContext';

export class ReporterPipeline {
  private readonly _reporters: ExceptionReporter[] = [];

  public addReporter(reporter: ExceptionReporter): void {
    this._reporters.push(reporter);
  }

  public async execute(error: CoreForgeError, context: ExceptionContext): Promise<string[]> {
    const executed: string[] = [];
    for (const reporter of this._reporters) {
      try {
        const res = reporter.report(error, context);
        if (res instanceof Promise) {
          await res;
        }
        executed.push(reporter.name);
      } catch (err: unknown) {
        // Resiliency check: prevent failing reporters from crashing other reporters
      }
    }
    return executed;
  }
}
