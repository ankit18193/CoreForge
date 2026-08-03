import { ModuleDescriptor } from '../descriptors/ModuleDescriptor';
import { CircularModuleDependencyError, ModuleDependencyError } from '../errors/ModuleErrors';

export class DependencyResolver {
  public resolve(descriptors: ModuleDescriptor[]): ModuleDescriptor[] {
    const nameToDescriptor = new Map<string, ModuleDescriptor>();
    descriptors.forEach((d) => nameToDescriptor.set(d.metadata.name, d));

    descriptors.forEach((d) => (d.dependencies.length = 0));

    for (const descriptor of descriptors) {
      for (const depName of descriptor.metadata.dependencies) {
        if (!nameToDescriptor.has(depName)) {
          throw new ModuleDependencyError(
            `Module "${descriptor.metadata.name}" depends on missing module "${depName}".`,
            { module: descriptor.metadata.name, dependency: depName },
          );
        }
        const depDesc = nameToDescriptor.get(depName)!;
        if (!descriptor.dependencies.includes(depDesc)) {
          descriptor.dependencies.push(depDesc);
        }
      }
    }

    const visited = new Set<string>();
    const temp = new Set<string>();
    const order: ModuleDescriptor[] = [];
    const path: string[] = [];

    const visit = (desc: ModuleDescriptor) => {
      const name = desc.metadata.name;

      if (temp.has(name)) {
        const cycleStartIndex = path.indexOf(name);
        const cycle = [...path.slice(cycleStartIndex), name].join(' -> ');
        throw new CircularModuleDependencyError(`Circular module dependency detected: ${cycle}`, {
          cycle,
        });
      }

      if (!visited.has(name)) {
        temp.add(name);
        path.push(name);

        for (const dep of desc.dependencies) {
          visit(dep);
        }

        temp.delete(name);
        path.pop();
        visited.add(name);
        order.push(desc);
      }
    };

    for (const descriptor of descriptors) {
      visit(descriptor);
    }

    return order;
  }
}
