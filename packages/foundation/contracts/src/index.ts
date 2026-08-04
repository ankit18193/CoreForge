import { FrameworkEnv } from '@coreforge/types';

export interface ServerConfig {
  readonly port: number;
  readonly host: string;
}

// Central Configuration Contract
export interface Config {
  readonly env: FrameworkEnv;
  readonly server: ServerConfig;
}

// Central Logger Contract
export interface Logger {
  debug(message: string, context?: unknown): void;
  info(message: string, context?: unknown): void;
  warn(message: string, context?: unknown): void;
  error(message: string, error?: Error, context?: unknown): void;
  fatal(message: string, error?: Error, context?: unknown): void;
}

// Framework Module Contract
export interface Module {
  readonly name: string;
  readonly dependencies: string[];

  onRegistered?(): Promise<void> | void;
  onConfigured?(config: unknown): Promise<void> | void;
  onInitialized?(): Promise<void> | void;
  onStarted?(): Promise<void> | void;
  onReady?(): Promise<void> | void;
  onStopping?(): Promise<void> | void;
  onShutdown?(): Promise<void> | void;
  onDisposed?(): Promise<void> | void;
}

// Dependency Injection Contract
export interface Container {
  resolve<T>(token: unknown): T;
  has(token: unknown): boolean;
}

// Event Bus Contract
export interface EventBus {
  publish(event: unknown): Promise<void>;
  subscribe(eventType: unknown, handler: (event: unknown) => Promise<void> | void): unknown;
  unsubscribe(subscription: unknown): void;
}

// Exception Pipeline Contracts
export interface ExceptionContext {
  readonly requestId?: string | undefined;
  readonly traceId?: string | undefined;
  readonly spanId?: string | undefined;
  readonly module?: string | undefined;
  readonly service?: string | undefined;
  readonly operation?: string | undefined;
  readonly environment?: string | undefined;
  readonly runtimeState?: string | undefined;
  readonly moduleState?: string | undefined;
  readonly timestamp: number;
  readonly metadata?: Readonly<Record<string, unknown>> | undefined;
}

export interface ExceptionHandler {
  handle(error: Error, context?: ExceptionContext): Promise<void>;
}

export interface Bootstrap {
  start(): Promise<void>;
  stop(): Promise<void>;
}
