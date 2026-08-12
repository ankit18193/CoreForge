import { ScannerValidationError } from '../errors/ScannerErrors';
import { RegistrationRegistry } from '../registry/RegistrationRegistry';

export class RegistrationConsistencyValidator {
  public validate(registry: RegistrationRegistry): void {
    const index = registry.index;
    for (const reg of registry.registrations) {
      if (reg.type === 'ROUTE') {
        const parentId = (reg as { parentId?: string }).parentId;
        if (parentId) {
          const parent = index.get(parentId);
          if (parent && parent.type !== 'CONTROLLER' && parent.type !== 'MODULE') {
            throw new ScannerValidationError(
              `RegistrationConsistencyValidator: Route registration "${reg.id}" parent "${parentId}" is type "${parent.type}" (expected CONTROLLER or MODULE).`,
            );
          }
        }
      }
    }
  }
}
