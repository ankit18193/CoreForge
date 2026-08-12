import {
  DiscoveryEngine as IDiscoveryEngine,
  DiscoveryResult,
  MetadataType,
} from '@coreforge/contracts';

import { DiscoveryConfiguration } from './DiscoveryConfiguration';
import { DiscoveryDiagnostics } from '../diagnostics/DiscoveryDiagnostics';
import { DependencyGraph } from '../graph/DependencyGraph';
import { GraphValidator } from '../graph/GraphValidator';
import { DiscoveryProfiler } from '../internal/DiscoveryProfiler';
import { DiscoveryLifecycleManager } from '../lifecycle/DiscoveryLifecycleManager';
import { DiscoveryState } from '../lifecycle/DiscoveryState';
import { DiscoveryIndex } from '../registry/DiscoveryIndex';
import { DiscoveryRegistry } from '../registry/DiscoveryRegistry';
import { DiscoveryResolver } from '../resolver/DiscoveryResolver';
import { ControllerScanner } from '../scanner/ControllerScanner';
import { InterceptorScanner } from '../scanner/InterceptorScanner';
import { MiddlewareScanner } from '../scanner/MiddlewareScanner';
import { ModuleScanner } from '../scanner/ModuleScanner';
import { ProviderScanner } from '../scanner/ProviderScanner';
import { RouteScanner } from '../scanner/RouteScanner';
import { SecurityScanner } from '../scanner/SecurityScanner';

export class DiscoveryEngine implements IDiscoveryEngine {
  private readonly _config: DiscoveryConfiguration;
  private readonly _lifecycle = new DiscoveryLifecycleManager();
  private readonly _diagnostics = new DiscoveryDiagnostics();

  private readonly _registry = new DiscoveryRegistry();
  private readonly _index = new DiscoveryIndex();
  private readonly _resolver: DiscoveryResolver;

  constructor(config: DiscoveryConfiguration) {
    this._config = config;
    this._resolver = new DiscoveryResolver(this._registry);
  }

  public get state(): DiscoveryState {
    return this._lifecycle.state;
  }

  public get diagnostics(): DiscoveryDiagnostics {
    return this._diagnostics;
  }

  public async discover(): Promise<DiscoveryResult> {
    const profiler = new DiscoveryProfiler();
    profiler.start();

    this._lifecycle.transitionTo(DiscoveryState.SCANNING);

    try {
      this._registry.clear();
      this._index.clear();

      const metadata = this._config.metadataRegistry;

      new ModuleScanner().scan(metadata, this._registry, this._index);
      new ControllerScanner().scan(metadata, this._registry, this._index);
      new ProviderScanner().scan(metadata, this._registry, this._index);
      new RouteScanner().scan(metadata, this._registry, this._index);
      new MiddlewareScanner().scan(metadata, this._registry, this._index);
      new InterceptorScanner().scan(metadata, this._registry, this._index);
      new SecurityScanner().scan(metadata, this._registry, this._index);

      this._lifecycle.transitionTo(DiscoveryState.VALIDATING);

      const graph = new DependencyGraph();

      const modulesList = this._registry.getByType(MetadataType.MODULE);
      for (const m of modulesList) {
        graph.addNode(m.id, m.dependencies);
      }

      const validator = new GraphValidator();
      validator.validate(graph);

      const result = this._resolver.resolve(graph);

      this._lifecycle.transitionTo(DiscoveryState.READY);

      this._diagnostics.recordDuration(profiler.durationMs);
      this._diagnostics.recordGraphMetrics(graph.size, 0, 0);

      const recordCounts = (type: MetadataType) => {
        this._diagnostics.recordCounts(type, this._registry.getByType(type).length);
      };

      const typesList = [
        MetadataType.MODULE,
        MetadataType.CONTROLLER,
        MetadataType.PROVIDER,
        MetadataType.ROUTE,
        MetadataType.MIDDLEWARE,
        MetadataType.INTERCEPTOR,
        MetadataType.SECURITY,
      ];
      for (const t of typesList) {
        recordCounts(t);
      }

      return result;
    } catch (err) {
      this._lifecycle.transitionTo(DiscoveryState.FAILED);
      throw err;
    }
  }

  public stop(): void {
    this._lifecycle.transitionTo(DiscoveryState.STOPPED);
  }
}
