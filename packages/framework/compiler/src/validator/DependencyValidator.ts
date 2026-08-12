import { DiscoveryResult } from '@coreforge/contracts';

import { CompilationValidationError } from '../errors/CompilerErrors';

export class DependencyValidator {
  public validate(discovery: DiscoveryResult): void {
    const graph = discovery.graph;
    for (const m of discovery.modules) {
      const deps = graph.getDependencies(m.id);
      for (const dep of deps) {
        if (!graph.hasNode(dep)) {
          throw new CompilationValidationError(
            `DependencyValidator: Module "${m.id}" depends on unresolved module reference "${dep}".`,
          );
        }
      }
    }
  }
}
