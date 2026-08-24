import { ConfigurationAccessor } from '../access/ConfigurationAccessor';
import { ConfigurationDiagnostics } from '../diagnostics/ConfigurationDiagnostics';
import { EnvironmentProfile } from '../environment/EnvironmentProfile';
import { EnvironmentResolver } from '../environment/EnvironmentResolver';
import { ConfigurationProfiler } from '../internal/ConfigurationProfiler';
import { ConfigurationLifecycleManager } from '../lifecycle/ConfigurationLifecycleManager';
import { ConfigurationLoader } from '../loader/ConfigurationLoader';
import { ConfigurationRegistry } from '../registry/ConfigurationRegistry';
import { ConfigurationSecretMasker } from '../security/ConfigurationSecretMasker';
import { EnvironmentVariableSource } from '../source/EnvironmentVariableSource';
import { ProgrammaticConfigurationSource } from '../source/ProgrammaticConfigurationSource';
import {
  Configuration,
  ConfigurationDiagnosticsSnapshot,
  ConfigurationOptions,
  ConfigurationSnapshot,
  ConfigurationSource,
  ConfigurationState,
  EnvironmentName,
  IConfigurationManager,
} from '../types/configurationTypes';
import { ConfigurationSchema } from '../validation/ConfigurationSchema';

export class ConfigurationManager implements IConfigurationManager, Configuration {
  private readonly _options: ConfigurationOptions;
  private readonly _lifecycle: ConfigurationLifecycleManager;
  private readonly _diagnostics: ConfigurationDiagnostics;
  private readonly _registry: ConfigurationRegistry;
  private readonly _customSources: ConfigurationSource[] = [];
  private readonly _programmaticOverrides: Record<string, unknown>[] = [];
  private _environment: EnvironmentName;
  private _schema?: ConfigurationSchema<unknown> | undefined;

  constructor(options: ConfigurationOptions = {}) {
    this._options = options;
    this._lifecycle = new ConfigurationLifecycleManager();
    this._diagnostics = new ConfigurationDiagnostics();
    this._registry = new ConfigurationRegistry();
    this._schema = options.schema as ConfigurationSchema<unknown> | undefined;
    this._environment = EnvironmentResolver.resolve(options.environment);
  }

  public get state(): ConfigurationState {
    return this._lifecycle.state;
  }

  public get ready(): boolean {
    return this._lifecycle.ready;
  }

  public get environment(): EnvironmentName {
    return this._environment;
  }

  public setSchema(schema: ConfigurationSchema<unknown>): this {
    this._schema = schema;
    return this;
  }

  public addSource(source: ConfigurationSource): this {
    this._customSources.push(source);
    return this;
  }

  public addOverrides(overrides: Record<string, unknown>): this {
    this._programmaticOverrides.push(overrides);
    return this;
  }

  public async load(): Promise<void> {
    const profiler = new ConfigurationProfiler();
    this._lifecycle.setLoading();

    try {
      // 1. Resolve environment
      this._environment = EnvironmentResolver.resolve(this._options.environment);

      // 2. Prepare Profile Defaults Source
      const profileManager = new EnvironmentProfile(this._options.customProfiles);
      const profileData = profileManager.getProfile(this._environment);
      const profileSource: ConfigurationSource = {
        name: `EnvironmentProfileSource[${this._environment}]`,
        load: () => profileData,
      };

      // 3. Prepare Environment Variable Source
      const envSource = new EnvironmentVariableSource({
        prefix: this._options.envPrefix,
      });

      // 4. Assemble sources in precedence order:
      // Profile Defaults -> Custom Sources -> Environment Variables -> Programmatic Overrides
      const loader = new ConfigurationLoader(this._schema);
      loader.registerSource(profileSource);

      for (const src of this._customSources) {
        loader.registerSource(src);
      }

      loader.registerSource(envSource);

      for (let i = 0; i < this._programmaticOverrides.length; i++) {
        loader.registerSource(
          new ProgrammaticConfigurationSource(
            this._programmaticOverrides[i],
            `ProgrammaticOverrideSource[${i}]`,
          ),
        );
      }

      this._diagnostics.recordLoadStart(loader.sources.length);

      // 5. Load and Validate
      this._lifecycle.setValidating();
      const validatedValues = await loader.load();
      this._diagnostics.recordValidation(true);

      // 6. Register and lock snapshot
      this._registry.unlockForReload();
      this._registry.register(this._environment, validatedValues);
      this._registry.lock();

      // 7. Mark READY
      this._lifecycle.setReady();

      const durationMs = profiler.stop();
      const keyCount = Object.keys(validatedValues).length;
      this._diagnostics.recordLoadSuccess(durationMs, keyCount);
    } catch (err) {
      this._diagnostics.recordValidation(false);
      this._lifecycle.reset();
      throw err;
    }
  }

  public get<T = unknown>(path: string): T | undefined {
    const snapshot = this._registry.getSnapshot();
    return ConfigurationAccessor.get<T>(snapshot.values, path);
  }

  public require<T = unknown>(path: string): T {
    const snapshot = this._registry.getSnapshot();
    return ConfigurationAccessor.require<T>(snapshot.values, path);
  }

  public has(path: string): boolean {
    const snapshot = this._registry.getSnapshot();
    return ConfigurationAccessor.has(snapshot.values, path);
  }

  public snapshot(): ConfigurationSnapshot {
    return this._registry.getSnapshot();
  }

  public get maskedSnapshot(): ConfigurationSnapshot {
    const original = this._registry.getSnapshot();
    return Object.freeze({
      environment: original.environment,
      version: original.version,
      loadedAt: original.loadedAt,
      values: ConfigurationSecretMasker.mask(original.values) as Readonly<unknown>,
    });
  }

  public get diagnostics(): ConfigurationDiagnosticsSnapshot {
    return this._diagnostics.getSnapshot(
      this._lifecycle.state,
      this._environment,
      this._registry.version,
    );
  }

  public async stop(): Promise<void> {
    this._lifecycle.setStopping();
    this._lifecycle.setStopped();
  }
}
