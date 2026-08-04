import { CoreForgeError } from '@coreforge/errors';

export interface ExceptionFilter {
  readonly name: string;
  shouldHandle(error: CoreForgeError): boolean;
}
