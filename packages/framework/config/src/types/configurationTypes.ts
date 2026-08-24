import {
  Configuration,
  ConfigurationManager as IConfigurationManager,
  ConfigurationSchema as IConfigurationSchema,
  ConfigurationSnapshot,
  ConfigurationSource,
  EnvironmentName,
} from '@coreforge/contracts';

export type {
  Configuration,
  IConfigurationManager,
  IConfigurationSchema,
  ConfigurationSnapshot,
  ConfigurationSource,
  EnvironmentName,
};

export type ConfigurationState =
  'CREATED' | 'LOADING' | 'VALIDATING' | 'READY' | 'STOPPING' | 'STOPPED';

export type ConfigurationFieldType = 'string' | 'number' | 'boolean' | 'enum' | 'object' | 'array';

export interface ConfigurationValidationRule {
  readonly path: string;
  readonly type?: ConfigurationFieldType | undefined;
  readonly required?: boolean | undefined;
  readonly default?: unknown | undefined;
  readonly enumValues?: readonly unknown[] | undefined;
  readonly min?: number | undefined;
  readonly max?: number | undefined;
  readonly pattern?: RegExp | string | undefined;
  readonly validator?: ((value: unknown) => boolean | string | void) | undefined;
}

export interface ConfigurationOptions {
  readonly environment?: EnvironmentName | string | undefined;
  readonly schema?: IConfigurationSchema | undefined;
  readonly enableDiagnostics?: boolean | undefined;
  readonly failFast?: boolean | undefined;
  readonly envPrefix?: string | undefined;
  readonly customProfiles?: Readonly<Record<string, Readonly<Record<string, unknown>>>> | undefined;
}

export interface ConfigurationDiagnosticsSnapshot {
  readonly loadCount: number;
  readonly validationCount: number;
  readonly validationFailures: number;
  readonly loadDurationMs: number;
  readonly lastLoadedAt?: number | undefined;
  readonly environment: EnvironmentName;
  readonly configurationVersion: number;
  readonly state: ConfigurationState;
  readonly sourceCount: number;
  readonly keyCount: number;
  readonly timestamp: number;
}
