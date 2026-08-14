import { RuntimeOrchestratorOptions } from './RuntimeOrchestratorOptions';

export class RuntimeOrchestratorConfiguration {
  constructor(options?: RuntimeOrchestratorOptions) {
    Object.freeze(options);
    Object.freeze(this);
  }
}
