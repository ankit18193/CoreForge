import { ConfigProvider } from '@coreforge/config';

export interface BootstrapOptions {
  configPath?: string | undefined;
  configProviders?: ConfigProvider[] | undefined;
  modules?: unknown[] | undefined;
  reporters?: unknown[] | undefined;
  logWriters?: unknown[] | undefined;
  runtimeOptions?:
    | {
        enableSignalHandlers?: boolean | undefined;
        [key: string]: unknown;
      }
    | undefined;
  startupTimeoutMs?: number | undefined;
}
