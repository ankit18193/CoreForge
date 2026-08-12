import { ScannerValidationError } from '../errors/ScannerErrors';
import { RegistrationRegistry } from '../registry/RegistrationRegistry';

export class DependencyValidator {
  public validate(registry: RegistrationRegistry): void {
    const index = registry.index;
    for (const reg of registry.registrations) {
      if (reg.type === 'MODULE') {
        const deps = (reg as { dependencies?: readonly string[] }).dependencies || [];
        for (const dep of deps) {
          if (!index.has(dep)) {
            throw new ScannerValidationError(
              `DependencyValidator: Module registration "${reg.id}" depends on missing module "${dep}".`,
            );
          }
        }
      }

      const pId = (reg as { parentId?: string }).parentId;
      if (pId && !index.has(pId)) {
        throw new ScannerValidationError(
          `DependencyValidator: Component registration "${reg.id}" requires missing parent ID "${pId}".`,
        );
      }
    }
  }
}
