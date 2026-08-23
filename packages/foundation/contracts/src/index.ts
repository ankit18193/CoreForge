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
  execute(controller: Controller, action: string, context: ActionContext): Promise<unknown>;
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
  resolve<T>(token: unknown): T | Promise<T>;
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
  intercept(context: InterceptorContext, next: NextInvocation): Promise<InterceptionResult>;
}

export interface InterceptorManager {
  execute(context: InterceptorContext, next: NextInvocation): Promise<InterceptionResult>;
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

export interface DecoratorMetadata {
  readonly id: string;
  readonly type: MetadataType;
  readonly target: string;
  readonly parentId?: string | undefined;
  readonly properties: Readonly<Record<string, unknown>>;
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

export interface RegistrationDescriptor {
  readonly id: string;
  readonly type: string;
}

export interface ScanResult {
  readonly registrations: readonly RegistrationDescriptor[];
}

export interface ApplicationScanner {
  scan(compilation: CompilationResult): Promise<ScanResult>;
}

export interface RuntimeAssembly {
  readonly modules: readonly unknown[];
  readonly providers: readonly unknown[];
  readonly controllers: readonly unknown[];
  readonly routes: readonly unknown[];
  readonly middleware: readonly unknown[];
  readonly interceptors: readonly unknown[];
  readonly security: readonly unknown[];
}

export interface AssemblyResult {
  readonly runtime: RuntimeAssembly;
}

export interface RuntimeAssembler {
  assemble(scan: ScanResult): Promise<AssemblyResult>;
}

export interface InitializedRuntime {
  readonly modules: readonly unknown[];
  readonly providers: readonly unknown[];
  readonly controllers: readonly unknown[];
  readonly routes: readonly unknown[];
  readonly middleware: readonly unknown[];
  readonly interceptors: readonly unknown[];
  readonly security: readonly unknown[];
}

export interface InitializationResult {
  readonly runtime: InitializedRuntime;
}

export interface RuntimeInitializer {
  initialize(assembly: RuntimeAssembly): Promise<InitializationResult>;
}

export interface RuntimeExecutionResult {
  readonly started: boolean;
}

export interface RuntimeOrchestrator {
  start(runtime: InitializedRuntime): Promise<RuntimeExecutionResult>;
  stop(): Promise<void>;
}

export interface ExtensionDescriptor {
  readonly id: string;
  readonly version: string;
  readonly dependencies?: readonly string[];
}

export interface ExtensionManager {
  register(extension: ExtensionDescriptor): void;
  enable(id: string): Promise<void>;
  disable(id: string): Promise<void>;
  registered(): readonly ExtensionDescriptor[];
}

export interface PluginDescriptor {
  readonly id: string;
  readonly version: string;
  readonly dependencies?: readonly string[];
}

export interface PluginContext {}

export interface Plugin {
  initialize(context: PluginContext): Promise<void>;
  shutdown(): Promise<void>;
}

export interface PluginManager {
  register(plugin: PluginDescriptor): void;
  enable(id: string): Promise<void>;
  disable(id: string): Promise<void>;
  registered(): readonly PluginDescriptor[];
}

export interface KernelSnapshot {
  readonly version: string;
  readonly initialized: boolean;
}

export interface FrameworkKernel {
  initialize(): Promise<KernelSnapshot>;
}

// Dependency Injection & Runtime Container Contracts
export type Constructor<T = unknown> = new (...args: never[]) => T;
export type AbstractConstructor<T = unknown> = abstract new (...args: never[]) => T;

export type InjectionToken<T = unknown> =
  string | symbol | Constructor<T> | AbstractConstructor<T> | ((...args: never[]) => T);

export type ProviderScope = 'SINGLETON' | 'REQUEST' | 'TRANSIENT';

export interface PropertyInjection {
  readonly propertyKey: string | symbol;
  readonly token: InjectionToken;
}

export interface ProviderDescriptor<T = unknown> {
  readonly token: InjectionToken<T>;
  readonly useClass?: Constructor<T> | undefined;
  readonly useValue?: T | undefined;
  readonly useFactory?: ((...args: unknown[]) => T | Promise<T>) | undefined;
  readonly dependencies?: readonly InjectionToken[] | undefined;
  readonly propertyInjections?: readonly PropertyInjection[] | undefined;
  readonly scope: ProviderScope;
}

export interface DependencyContainer {
  resolve<T>(token: InjectionToken<T>): Promise<T>;
  register<T>(provider: ProviderDescriptor<T>): void;
}

// Request Context & Scope Engine Contracts
export interface RequestContextOptions {
  readonly id?: string | undefined;
  readonly correlationId?: string | undefined;
  readonly traceId?: string | undefined;
  readonly timeoutMs?: number | undefined;
  readonly signal?: AbortSignal | undefined;
  readonly attributes?: Readonly<Record<string, unknown>> | undefined;
  readonly parentContext?: RequestContext | undefined;
}

export interface RequestContext {
  readonly id: string;
  readonly correlationId: string;
  readonly traceId?: string | undefined;
  readonly startTime: number;
  readonly signal: AbortSignal;
  readonly scope: RequestScope;
  resolve<T>(token: InjectionToken<T>): Promise<T>;
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T): void;
  has(key: string): boolean;
  dispose(): Promise<void>;
}

export interface RequestContextManager {
  createContext(options?: RequestContextOptions): Promise<RequestContext>;
  runInContext<R>(
    options: RequestContextOptions | undefined,
    fn: (context: RequestContext) => Promise<R>,
  ): Promise<R>;
  runInContext<R>(fn: (context: RequestContext) => Promise<R>): Promise<R>;
  getCurrentContext(): RequestContext | undefined;
}

// Parameter Binding Contracts
export type ParameterBindingSource = 'PARAM' | 'QUERY' | 'BODY' | 'HEADER' | 'COOKIE';

export interface ParameterBindingDescriptor {
  readonly id: string;
  readonly actionId: string;
  readonly parameterIndex: number;
  readonly source: ParameterBindingSource;
  readonly name?: string | undefined;
  readonly required: boolean;
}

export interface ParameterBindingResolver {
  resolveArguments(descriptors: readonly ParameterBindingDescriptor[], request: unknown): unknown[];
}

// Action Execution Contracts
export type ExecutionResult<T = unknown> = T;

export interface ActionDescriptor {
  readonly id: string;
  readonly controllerToken: InjectionToken;
  readonly methodName: string | symbol;
  readonly parameterBindings: readonly ParameterBindingDescriptor[];
  readonly guards: readonly InjectionToken[];
  readonly middleware: readonly InjectionToken[];
  readonly interceptors: readonly InjectionToken[];
}

export interface ExecutionContext {
  readonly requestContext: RequestContext;
  readonly action: ActionDescriptor;
  readonly request: unknown;

  resolve<T>(token: InjectionToken<T>): Promise<T>;
}

export interface ExecutionActionInvoker {
  invoke(context: ExecutionContext, arguments_: readonly unknown[]): Promise<unknown>;
}

export interface ExecutionEngine {
  execute(action: ActionDescriptor, request: unknown, context: RequestContext): Promise<unknown>;
}

// Response Processing & Serialization Contracts
export type ResponseStatus = number;

export interface ResponseHeaders {
  readonly values: Readonly<Record<string, string | readonly string[]>>;
}

export interface ResponseDescriptor<T = unknown> {
  readonly status: ResponseStatus;
  readonly headers: ResponseHeaders;
  readonly contentType?: string | undefined;
  readonly body: T;
}

export interface ResponseProcessor {
  process<T>(result: T | Promise<T>): Promise<ResponseDescriptor>;
}

export interface ResponseSerializationOptions {
  readonly contentType?: string | undefined;
  readonly status?: number | undefined;
  readonly headers?: Readonly<Record<string, string | readonly string[]>>;
}

// Exception Handling & Error Pipeline Contracts
export type ErrorCategory =
  | 'VALIDATION'
  | 'AUTHENTICATION'
  | 'AUTHORIZATION'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'DEPENDENCY'
  | 'TIMEOUT'
  | 'CANCELLATION'
  | 'EXECUTION'
  | 'SERIALIZATION'
  | 'INTERNAL';

export interface ErrorCauseDescriptor {
  readonly code?: string | undefined;
  readonly category?: ErrorCategory | undefined;
  readonly message: string;
}

export interface ErrorDescriptor {
  readonly code: string;
  readonly category: ErrorCategory;
  readonly message: string;
  readonly status: number;
  readonly details?: Readonly<Record<string, unknown>> | undefined;
  readonly cause?: ErrorCauseDescriptor | undefined;
  readonly stack?: string | undefined;
  readonly timestamp: number;
}

export interface ExceptionContext {
  readonly requestContext: RequestContext;
  readonly error: unknown;

  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T): void;
}

export interface ExceptionHandler {
  readonly priority?: number | undefined;

  canHandle(error: unknown, context: ExceptionContext): boolean | Promise<boolean>;

  handle(error: unknown, context: ExceptionContext): ErrorDescriptor | Promise<ErrorDescriptor>;
}

export interface ExceptionPipeline {
  handle(error: unknown, context: ExceptionContext): Promise<ErrorDescriptor>;
}
