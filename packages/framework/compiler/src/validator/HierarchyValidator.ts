import { DiscoveryResult } from '@coreforge/contracts';

import { CompilationValidationError } from '../errors/CompilerErrors';

export class HierarchyValidator {
  public validate(discovery: DiscoveryResult): void {
    const modules = new Set(discovery.modules.map((m) => m.id));

    for (const c of discovery.controllers) {
      if (!c.parentId || !modules.has(c.parentId)) {
        throw new CompilationValidationError(
          `HierarchyValidator: Controller "${c.id}" refers to missing parent module "${c.parentId}".`,
        );
      }
    }

    for (const p of discovery.providers) {
      if (!p.parentId || !modules.has(p.parentId)) {
        throw new CompilationValidationError(
          `HierarchyValidator: Provider "${p.id}" refers to missing parent module "${p.parentId}".`,
        );
      }
    }
  }
}
