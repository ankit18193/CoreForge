import { DiscoveryResult } from '@coreforge/contracts';

import { CompilationValidationError } from '../errors/CompilerErrors';

export class DuplicateValidator {
  public validate(discovery: DiscoveryResult): void {
    const modules = new Set<string>();
    for (const m of discovery.modules) {
      if (modules.has(m.id)) {
        throw new CompilationValidationError(
          `DuplicateValidator: Duplicate module registered with ID "${m.id}".`,
        );
      }
      modules.add(m.id);
    }

    const providers = new Set<string>();
    const moduleServiceTokens = new Set<string>();
    for (const p of discovery.providers) {
      if (providers.has(p.id)) {
        throw new CompilationValidationError(
          `DuplicateValidator: Duplicate provider registered with ID "${p.id}".`,
        );
      }
      providers.add(p.id);

      const tokenKey = `${p.parentId || ''}:${(p as { serviceToken?: string }).serviceToken || p.id}`;
      if (moduleServiceTokens.has(tokenKey)) {
        throw new CompilationValidationError(
          `DuplicateValidator: Duplicate provider service token registered within the same module: "${tokenKey}".`,
        );
      }
      moduleServiceTokens.add(tokenKey);
    }

    const routes = new Set<string>();
    for (const r of discovery.routes) {
      const path = (r as { path?: string }).path || '';
      const method = (r as { method?: string }).method || 'GET';
      const key = `${method}:${path}`;
      if (routes.has(key)) {
        throw new CompilationValidationError(
          `DuplicateValidator: Duplicate route registered: "${method} ${path}".`,
        );
      }
      routes.add(key);
    }
  }
}
