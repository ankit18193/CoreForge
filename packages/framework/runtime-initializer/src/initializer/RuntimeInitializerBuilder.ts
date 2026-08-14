import { RuntimeInitializerConfiguration } from './RuntimeInitializerConfiguration';

export class RuntimeInitializerBuilder {
  public build(): RuntimeInitializerConfiguration {
    return new RuntimeInitializerConfiguration();
  }
}
