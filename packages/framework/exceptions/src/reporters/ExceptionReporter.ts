import { CoreForgeError } from '@coreforge/errors';

import { ExceptionContext } from '../context/ExceptionContext';

export interface ExceptionReporter {
  readonly name: string;
  report(error: CoreForgeError, context: ExceptionContext): Promise<void> | void;
}
