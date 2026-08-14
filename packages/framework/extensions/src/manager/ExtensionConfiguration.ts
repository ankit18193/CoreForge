import { ExtensionOptions } from './ExtensionOptions';

export class ExtensionConfiguration {
  constructor(options?: ExtensionOptions) {
    Object.freeze(options);
    Object.freeze(this);
  }
}
