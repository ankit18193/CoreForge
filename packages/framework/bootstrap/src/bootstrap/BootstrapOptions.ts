import { ConfigProvider } from '@coreforge/config';
import { ExceptionReporter } from '@coreforge/exceptions';

export interface BootstrapOptions {
  configPath?: string | undefined;
  configProviders?: ConfigProvider[] | undefined;
  modules?: unknown[] | undefined;
  reporters?: ExceptionReporter[] | undefined;
  logWriters?: unknown[] | undefined;
  runtimeOptions?:
    | {
        enableSignalHandlers?: boolean | undefined;
        [key: string]: unknown;
      }
    | undefined;
  startupTimeoutMs?: number | undefined;
}
