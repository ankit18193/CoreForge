import { RuntimeOrchestratorConfiguration } from './RuntimeOrchestratorConfiguration';

export class RuntimeOrchestratorBuilder {
  public build(): RuntimeOrchestratorConfiguration {
    return new RuntimeOrchestratorConfiguration();
  }
}
