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
  start(runtime?: InitializedRuntime): Promise<RuntimeExecutionResult | void>;
  handle?(request: unknown, nativeResponse?: unknown, writer?: unknown): Promise<unknown>;
  stop(): Promise<void>;
  readonly state?: unknown;
  readonly snapshot?: unknown;
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

// Canonical Normalized Request & Transport Boundary Contracts
export interface NormalizedRequest {
  readonly method?: string | undefined;
  readonly path?: string | undefined;
  readonly params?: Readonly<Record<string, unknown>> | undefined;
  readonly query?: Readonly<Record<string, unknown>> | undefined;
  readonly body?: unknown | undefined;
  readonly headers?: Readonly<Record<string, string | readonly string[] | undefined>> | undefined;
  readonly cookies?: Readonly<Record<string, string | undefined>> | undefined;
}

export type TransportRequest = NormalizedRequest;

export interface TransportResponse {
  readonly status: number;
  readonly headers: Readonly<Record<string, string | readonly string[]>>;
  readonly contentType?: string | undefined;
  readonly body: unknown;
}

export interface TransportRequestNormalizer<TNativeRequest = unknown> {
  normalize(request: TNativeRequest): NormalizedRequest;
}

export interface TransportResponseWriter<TNativeResponse = unknown> {
  write(response: TNativeResponse, descriptor: ResponseDescriptor): void | Promise<void>;
}

export interface TransportAdapter<TNativeRequest = unknown, TNativeResponse = unknown> {
  readonly name: string;

  normalizeRequest(request: TNativeRequest): NormalizedRequest;

  writeResponse(response: TNativeResponse, descriptor: ResponseDescriptor): void | Promise<void>;
}

// Routing & Route Matching Engine Contracts
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export type RouteSegment =
  | {
      readonly kind: 'STATIC';
      readonly value: string;
    }
  | {
      readonly kind: 'PARAM';
      readonly name: string;
      readonly constraint?: string | undefined;
    }
  | {
      readonly kind: 'WILDCARD';
      readonly name: string;
    };

export interface CompiledRoute {
  readonly id: string;
  readonly method: HttpMethod;
  readonly path: string;
  readonly segments: readonly RouteSegment[];
  readonly action: ActionDescriptor;
  readonly precedence: number;
}

export interface RouteMatcher<TRouteMatch = unknown> {
  match(request: NormalizedRequest): TRouteMatch;
}

// Application Runtime Orchestrator & Lifecycle Engine Contracts
export type RuntimeState =
  | 'CREATED'
  | 'VALIDATING'
  | 'COMPILING'
  | 'INITIALIZING'
  | 'READY'
  | 'STOPPING'
  | 'STOPPED'
  | 'FAILED';

export interface RuntimeApplication {
  start(): Promise<void>;
  stop(): Promise<void>;
  readonly state: RuntimeState;
  readonly ready: boolean;
}

export interface RuntimeSnapshot {
  readonly state: RuntimeState;
  readonly startedAt?: number | undefined;
  readonly stoppedAt?: number | undefined;
  readonly activeRequests: number;
  readonly ready: boolean;
}

// Configuration & Environment Management Engine Contracts
export type EnvironmentName = 'development' | 'test' | 'staging' | 'production';

export interface ConfigurationSource {
  readonly name: string;
  load(): Promise<Readonly<Record<string, unknown>>> | Readonly<Record<string, unknown>>;
}

export interface ConfigurationSchema<T = unknown> {
  validate(value: unknown): T;
}

export interface ConfigurationSnapshot<T = unknown> {
  readonly environment: EnvironmentName;
  readonly version: number;
  readonly loadedAt: number;
  readonly values: Readonly<T>;
}

export interface Configuration {
  get<T = unknown>(path: string): T | undefined;
  require<T = unknown>(path: string): T;
  has(path: string): boolean;
  snapshot(): ConfigurationSnapshot;
}

export interface ConfigurationManager {
  load(): Promise<void>;
  get<T = unknown>(path: string): T | undefined;
  require<T = unknown>(path: string): T;
  has(path: string): boolean;
  snapshot(): ConfigurationSnapshot;
  readonly ready: boolean;
}

// Structured Logging & Log Pipeline Engine Contracts
export type LogLevel = 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';

export interface LogErrorDescriptor {
  readonly name: string;
  readonly message: string;
  readonly code?: string | undefined;
  readonly stack?: string | undefined;
  readonly cause?: LogErrorDescriptor | undefined;
}

export interface LogRecord {
  readonly timestamp: number;
  readonly level: LogLevel;
  readonly message: string;
  readonly context: Readonly<Record<string, unknown>>;
  readonly metadata?: Readonly<Record<string, unknown>> | undefined;
  readonly error?: LogErrorDescriptor | undefined;
}

export interface Logger {
  trace(message: string, metadata?: Record<string, unknown>): void;
  debug(message: string, metadata?: Record<string, unknown>): void;
  info(message: string, metadata?: Record<string, unknown>): void;
  warn(message: string, metadata?: Record<string, unknown>): void;
  error(
    message: string,
    metadataOrError?: Record<string, unknown> | unknown,
    error?: unknown,
  ): void;
  fatal(
    message: string,
    metadataOrError?: Record<string, unknown> | unknown,
    error?: unknown,
  ): void;

  child(context: Record<string, unknown>): Logger;
}

export interface LogSink {
  readonly name: string;
  write(record: LogRecord): void | Promise<void>;
  flush?(): void | Promise<void>;
  close?(): void | Promise<void>;
}

export interface LogProcessor {
  readonly name: string;
  process(record: LogRecord): LogRecord | Promise<LogRecord>;
}

export interface LoggerFactory {
  create(context?: Record<string, unknown>): Logger;
}

export interface LoggingDiagnosticsSnapshot {
  readonly totalLogs: number;
  readonly logsByLevel: Readonly<Record<LogLevel, number>>;
  readonly processorFailures: number;
  readonly sinkFailures: number;
  readonly averageProcessingDurationMs: number;
  readonly slowestProcessingDurationMs: number;
}

// Event Bus & Application Event Pipeline Engine Contracts
export interface DomainEvent<TPayload = unknown> {
  readonly id: string;
  readonly type: string;
  readonly timestamp: number;
  readonly payload: TPayload;
}

export interface EventHandlerContext {
  readonly event: DomainEvent;
  readonly signal?: AbortSignal | undefined;
}

export type EventHandler<TEvent extends DomainEvent = DomainEvent> = (
  event: TEvent,
  context: EventHandlerContext,
) => void | Promise<void>;

export interface EventSubscription {
  readonly id: string;
  readonly eventType: string;
  unsubscribe(): void;
}

export interface EventRetryPolicy {
  readonly maxAttempts: number;
  readonly delayMs?: number | undefined;
}

export interface EventHandlerOptions {
  readonly priority?: number | undefined;
  readonly retry?: EventRetryPolicy | undefined;
}

export type EventDispatchMode = 'SEQUENTIAL' | 'PARALLEL';

export interface EventDispatchOptions {
  readonly mode?: EventDispatchMode | undefined;
  readonly signal?: AbortSignal | undefined;
}

export interface EventFailureDescriptor {
  readonly handlerId: string;
  readonly message: string;
  readonly code?: string | undefined;
}

export interface EventDispatchResult {
  readonly eventId: string;
  readonly eventType: string;
  readonly handlerCount: number;
  readonly successfulHandlers: number;
  readonly failedHandlers: number;
  readonly cancelled: boolean;
  readonly durationMs: number;
  readonly errors?: readonly EventFailureDescriptor[] | undefined;
}

export interface EventBus {
  emit<T extends DomainEvent>(
    event: T,
    options?: EventDispatchOptions,
  ): Promise<EventDispatchResult>;
  subscribe<T extends DomainEvent>(
    eventType: string,
    handler: EventHandler<T>,
    options?: EventHandlerOptions,
  ): EventSubscription;
}

export interface EventDiagnosticsSnapshot {
  readonly totalEvents: number;
  readonly successfulEvents: number;
  readonly failedEvents: number;
  readonly cancelledEvents: number;
  readonly totalHandlerExecutions: number;
  readonly failedHandlerExecutions: number;
  readonly retryCount: number;
  readonly averageEventDurationMs: number;
  readonly slowestEventDurationMs: number;
  readonly eventTypeDistribution: Readonly<Record<string, number>>;
}

// Caching & Cache Abstraction Engine Contracts
export interface CacheSetOptions {
  readonly ttlMs?: number | undefined;
}

export interface CacheProvider {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T, options?: CacheSetOptions): Promise<void>;
  delete(key: string): Promise<boolean>;
  has(key: string): Promise<boolean>;
  clear(): Promise<void>;
}

export interface CacheSerializer<T = unknown> {
  serialize(value: T): unknown;
  deserialize(value: unknown): T;
}

export type CacheFailurePolicy = 'FAIL_OPEN' | 'FAIL_CLOSED';

export interface Cache {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T, options?: CacheSetOptions): Promise<void>;
  delete(key: string): Promise<boolean>;
  has(key: string): Promise<boolean>;
  clear(): Promise<void>;
  getOrSet<T>(key: string, factory: () => Promise<T>, options?: CacheSetOptions): Promise<T>;
  namespace(name: string): Cache;
}

export interface CacheDiagnosticsSnapshot {
  readonly totalGets: number;
  readonly hits: number;
  readonly misses: number;
  readonly sets: number;
  readonly deletes: number;
  readonly expirations: number;
  readonly providerFailures: number;
  readonly factoryExecutions: number;
  readonly stampedePreventions: number;
  readonly averageLatencyMs: number;
  readonly slowestLatencyMs: number;
}

// Background Jobs & Task Queue Engine Contracts
export type JobState =
  | 'CREATED'
  | 'QUEUED'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'RETRYING'
  | 'DEAD_LETTERED'
  | 'CANCELLED';

export interface Job<TPayload = unknown> {
  readonly id: string;
  readonly type: string;
  readonly payload: TPayload;
  readonly createdAt: number;
  readonly attempt: number;
  readonly state: JobState;
  readonly priority?: number | undefined;
  readonly deduplicationKey?: string | undefined;
  readonly error?: string | undefined;
  readonly retry?: JobRetryPolicy | undefined;
}

export interface JobExecutionContext {
  readonly job: Job;
  readonly signal: AbortSignal;
}

export interface JobHandler<TPayload = unknown> {
  execute(payload: TPayload, context: JobExecutionContext): Promise<void> | void;
}

export interface JobRetryPolicy {
  readonly maxAttempts: number;
  readonly backoffMs?: number | undefined;
  readonly backoffMultiplier?: number | undefined;
  readonly maxBackoffMs?: number | undefined;
}

export interface JobOptions {
  readonly priority?: number | undefined;
  readonly retry?: JobRetryPolicy | undefined;
  readonly deduplicationKey?: string | undefined;
}

export interface JobQueue {
  enqueue<T>(type: string, payload: T, options?: JobOptions): Promise<Job<T>>;

  register<T>(type: string, handler: JobHandler<T>): void;

  cancel(jobId: string): Promise<boolean>;

  get(jobId: string): Promise<Job | undefined>;
}

export interface JobDiagnosticsSnapshot {
  readonly totalEnqueued: number;
  readonly totalCompleted: number;
  readonly totalFailed: number;
  readonly totalRetried: number;
  readonly totalCancelled: number;
  readonly totalDeadLettered: number;
  readonly activeJobs: number;
  readonly queuedJobs: number;
  readonly averageDurationMs: number;
  readonly slowestDurationMs: number;
}
