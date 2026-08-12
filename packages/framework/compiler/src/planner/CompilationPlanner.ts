import { CompilationContext } from './CompilationContext';
import { ControllerModel } from '../model/ControllerModel';
import { ModuleModel } from '../model/ModuleModel';
import { ProviderModel } from '../model/ProviderModel';
import { RouteModel } from '../model/RouteModel';

export class CompilationPlanner {
  public plan(context: CompilationContext): {
    modules: readonly ModuleModel[];
    controllers: readonly ControllerModel[];
    providers: readonly ProviderModel[];
    routes: readonly RouteModel[];
  } {
    const discovery = context.discovery;

    const resolvedModules: ModuleModel[] = [];
    const visited = new Set<string>();

    const visit = (id: string) => {
      if (visited.has(id)) {
        return;
      }
      visited.add(id);

      const mMetadata = discovery.modules.find((m) => m.id === id);
      if (mMetadata) {
        for (const dep of discovery.graph.getDependencies(id)) {
          visit(dep);
        }
        resolvedModules.push(
          new ModuleModel(
            mMetadata.id,
            (mMetadata as { name?: string }).name || mMetadata.id,
            discovery.graph.getDependencies(id),
          ),
        );
      }
    };

    for (const m of discovery.modules) {
      visit(m.id);
    }

    const providers = discovery.providers.map(
      (p) =>
        new ProviderModel(
          p.id,
          p.parentId!,
          (p as { serviceToken?: string }).serviceToken || p.id,
          (p as { scope?: string }).scope || 'SINGLETON',
        ),
    );

    const controllers = discovery.controllers.map(
      (c) => new ControllerModel(c.id, (c as { name?: string }).name || c.id, c.parentId!),
    );

    const routes = discovery.routes.map(
      (r) =>
        new RouteModel(
          r.id,
          r.parentId!,
          (r as { path?: string }).path || '',
          (r as { method?: string }).method || 'GET',
        ),
    );

    return {
      modules: resolvedModules,
      controllers,
      providers,
      routes,
    };
  }
}
