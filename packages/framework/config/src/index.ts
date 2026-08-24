// Types
export * from './types/configurationTypes';

// Errors
export * from './errors/ConfigurationErrors';

// Security
export * from './security/ConfigurationSecretMasker';

// Access
export * from './access/ConfigurationPath';
export * from './access/ConfigurationAccessor';

// Environment
export * from './environment/EnvironmentProfile';
export * from './environment/EnvironmentResolver';

// Sources
export * from './source/ConfigurationSource';
export * from './source/EnvironmentVariableSource';
export * from './source/ProgrammaticConfigurationSource';

// Validation
export * from './validation/ConfigurationValidationResult';
export * from './validation/ConfigurationSchema';
export * from './validation/ConfigurationValidator';

// Registry
export * from './registry/ConfigurationRegistry';

// Lifecycle
export * from './lifecycle/ConfigurationState';
export * from './lifecycle/ConfigurationLifecycleManager';

// Diagnostics
export * from './diagnostics/ConfigurationDiagnostics';

// Loader
export * from './loader/ConfigurationLoadContext';
export * from './loader/ConfigurationLoader';

// Manager
export * from './manager/ConfigurationManager';
export * from './manager/ConfigurationManagerBuilder';

// Backward Compatibility Aliases
export { ConfigurationSchema as ConfigSchema } from './validation/ConfigurationSchema';
export { ProgrammaticConfigurationSource as DefaultProvider } from './source/ProgrammaticConfigurationSource';
export { EnvironmentVariableSource as EnvProvider } from './source/EnvironmentVariableSource';
export type { ConfigurationSource as ConfigProvider } from './types/configurationTypes';
