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

export interface FrameworkRegistry {
  get<T>(name: string): T;
  has(name: string): boolean;
}

export interface Bootstrap {
  start(): Promise<void>;
  stop(): Promise<void>;
}

export interface HttpServer {
  start(): Promise<void>;
  stop(): Promise<void>;
}

export interface HttpRequest {
  readonly method: string;
  readonly url: string;
  readonly path: string;
  readonly query: Readonly<Record<string, unknown>>;
  readonly headers: Readonly<Record<string, unknown>>;
  readonly cookies: Readonly<Record<string, unknown>>;
  readonly body: unknown;
  readonly parameters: Readonly<Record<string, unknown>>;
  readonly remoteAddress: string;
  readonly protocol: string;
  readonly requestId: string;
}

export interface HttpResponse {
  readonly status: number;
  readonly headers: Readonly<Record<string, unknown>>;
  readonly cookies: Readonly<Record<string, unknown>>;
  readonly body: unknown;
  readonly contentType?: string | undefined;
}

export interface HttpAdapter {
  readonly name: string;
  start(): Promise<void>;
  stop(): Promise<void>;
  setHandler(handler: (request: HttpRequest) => Promise<HttpResponse>): void;
}

export enum RouteMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE',
  OPTIONS = 'OPTIONS',
  HEAD = 'HEAD',
  ALL = 'ALL',
}

export interface RouteDefinition {
  readonly method: RouteMethod;
  readonly path: string;
}

export interface RouteMatch {
  readonly route: RouteDefinition;
  readonly parameters: Readonly<Record<string, string>>;
}

export interface Router {
  register(route: RouteDefinition): void;
  resolve(method: RouteMethod, path: string): RouteMatch | undefined;
}

export interface MiddlewareContext {}

export interface Next {
  (): Promise<void>;
}

export interface Middleware {
  execute(context: MiddlewareContext, next: Next): Promise<void>;
}

export interface Controller {}

export interface ActionContext {}

export interface ControllerExecutor {
  execute(
    controller: Controller,
    action: string,
    context: ActionContext,
  ): Promise<unknown>;
}

export interface RequestHandler {
  handle(request: HttpRequest, response: HttpResponse): Promise<void>;
}

export interface ValidationError {
  readonly path: string;
  readonly message: string;
  readonly ruleName: string;
}

export interface ValidationWarning {
  readonly path: string;
  readonly message: string;
}

export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly ValidationError[];
  readonly warnings: readonly ValidationWarning[];
}

export interface ActionArguments {
  readonly positionals: readonly unknown[];
  readonly named: Readonly<Record<string, unknown>>;
  readonly rawValues: Readonly<Record<string, unknown>>;
}

export interface RequestBinder {
  bind(context: ActionContext): Promise<ActionArguments>;
}

export interface Disposable {
  dispose(): Promise<void>;
}

export interface RequestScope {
  readonly id: string;
  resolve<T>(token: unknown): T;
  dispose(): Promise<void>;
}

export interface InvocationResult {
  readonly value: unknown;
}

export interface ActionInvoker {
  invoke(
    controller: Controller,
    action: string,
    args: ActionArguments,
    scope: RequestScope,
  ): Promise<InvocationResult>;
}

export interface SerializationResult {
  readonly body: unknown;
  readonly headers: Readonly<Record<string, string>>;
  readonly statusCode: number;
}

export interface Serializer {
  serialize(result: InvocationResult, acceptHeader?: string): Promise<SerializationResult>;
}

export interface Principal {
  readonly id: string;
  readonly authenticated: boolean;
  readonly roles: readonly string[];
  readonly claims: Readonly<Record<string, unknown>>;
}

export interface SecurityContext {
  readonly principal?: Principal | undefined;
}

export interface AuthenticationProvider {
  authenticate(context: SecurityContext): Promise<Principal | undefined>;
}

export interface AuthorizationPolicy {
  authorize(context: SecurityContext): Promise<boolean>;
}

export interface SecurityManager {
  authenticate(context: SecurityContext): Promise<void>;
  authorize(context: SecurityContext): Promise<void>;
}

export interface InterceptionResult {
  readonly value: unknown;
}

export interface NextInvocation {
  proceed(): Promise<InterceptionResult>;
}

export interface InterceptorContext {
  readonly requestScope: RequestScope;
  readonly controller: Controller;
  readonly action: string;
  readonly requestId?: string | undefined;
  readonly route?: string | undefined;
  readonly securityContext?: SecurityContext | undefined;
  readonly invocationContext?: unknown | undefined;
}

export interface Interceptor {
  intercept(
    context: InterceptorContext,
    next: NextInvocation,
  ): Promise<InterceptionResult>;
}

export interface InterceptorManager {
  execute(
    context: InterceptorContext,
    next: NextInvocation,
  ): Promise<InterceptionResult>;
}

export interface Application {
  start(): Promise<void>;
  stop(): Promise<void>;
}

export enum MetadataType {
  MODULE = 'MODULE',
  CONTROLLER = 'CONTROLLER',
  ACTION = 'ACTION',
  ROUTE = 'ROUTE',
  PARAMETER = 'PARAMETER',
  PROVIDER = 'PROVIDER',
  MIDDLEWARE = 'MIDDLEWARE',
  INTERCEPTOR = 'INTERCEPTOR',
  SECURITY = 'SECURITY',
}

export interface MetadataDescriptor {
  readonly id: string;
  readonly type: MetadataType;
  readonly parentId?: string | undefined;
}

export interface MetadataRegistry {
  register(descriptor: MetadataDescriptor): void;
  resolve(type: MetadataType): readonly MetadataDescriptor[];
}

export interface DependencyGraph {
  readonly size: number;
  hasNode(id: string): boolean;
  getDependencies(id: string): readonly string[];
}

export interface DiscoveryResult {
  readonly graph: DependencyGraph;
  readonly modules: readonly MetadataDescriptor[];
  readonly controllers: readonly MetadataDescriptor[];
  readonly providers: readonly MetadataDescriptor[];
  readonly routes: readonly MetadataDescriptor[];
  readonly middleware: readonly MetadataDescriptor[];
  readonly interceptors: readonly MetadataDescriptor[];
  readonly security: readonly MetadataDescriptor[];
}

export interface DiscoveryEngine {
  discover(): Promise<DiscoveryResult>;
}

export interface CompilationArtifact {}

export interface CompilationResult {
  readonly application: CompilationArtifact;
}

export interface ModuleCompiler {
  compile(discovery: DiscoveryResult): Promise<CompilationResult>;
}
