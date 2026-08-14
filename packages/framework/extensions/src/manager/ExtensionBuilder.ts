import { ExtensionConfiguration } from './ExtensionConfiguration';

export class ExtensionBuilder {
  public build(): ExtensionConfiguration {
    return new ExtensionConfiguration();
  }
}
