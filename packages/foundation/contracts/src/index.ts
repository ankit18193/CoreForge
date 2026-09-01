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

export interface ControllerInterceptor {
  intercept(context: InterceptorContext, next: NextInvocation): Promise<InterceptionResult>;
}

export interface ControllerInterceptorManager {
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
export type ActionExecutionResult<T = unknown> = T;

export interface ActionDescriptor {
  readonly id: string;
  readonly controllerToken: InjectionToken;
  readonly methodName: string | symbol;
  readonly parameterBindings: readonly ParameterBindingDescriptor[];
  readonly guards: readonly InjectionToken[];
  readonly middleware: readonly InjectionToken[];
  readonly interceptors: readonly InjectionToken[];
}

export interface ActionExecutionContext {
  readonly requestContext: RequestContext;
  readonly action: ActionDescriptor;
  readonly request: unknown;

  resolve<T>(token: InjectionToken<T>): Promise<T>;
}

export interface ExecutionActionInvoker {
  invoke(context: ActionExecutionContext, arguments_: readonly unknown[]): Promise<unknown>;
}

export interface ActionExecutionEngine {
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

// Canonical Normalized Request
export interface NormalizedRequest {
  readonly method?: string | undefined;
  readonly path?: string | undefined;
  readonly params?: Readonly<Record<string, unknown>> | undefined;
  readonly query?: Readonly<Record<string, unknown>> | undefined;
  readonly body?: unknown | undefined;
  readonly headers?: Readonly<Record<string, string | readonly string[] | undefined>> | undefined;
  readonly cookies?: Readonly<Record<string, string | undefined>> | undefined;
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

export type DomainEventHandler<TEvent extends DomainEvent = DomainEvent> = (
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

export interface DomainEventHandlerOptions {
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
    handler: DomainEventHandler<T>,
    options?: DomainEventHandlerOptions,
  ): EventSubscription;
}

export interface DomainEventDiagnosticsSnapshot {
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

// Distributed Coordination & Locking Engine Contracts
export interface LockAcquireOptions {
  readonly ttlMs: number;
  readonly timeoutMs?: number | undefined;
  readonly signal?: AbortSignal | undefined;
}

export interface LockLease {
  readonly key: string;
  readonly token: string;
  readonly acquiredAt: number;
  readonly expiresAt: number;
}

export interface LockProvider {
  acquire(key: string, ttlMs: number): Promise<LockLease | undefined>;
  renew(key: string, token: string, ttlMs: number): Promise<LockLease | undefined>;
  release(key: string, token: string): Promise<boolean>;
  isLocked(key: string): Promise<boolean>;
}

export interface Lock {
  acquire(options: LockAcquireOptions): Promise<LockLease>;
  renew(lease: LockLease, ttlMs: number): Promise<LockLease>;
  release(lease: LockLease): Promise<boolean>;
  isLocked(): Promise<boolean>;
  namespace(name: string): Lock;
}

export interface LockManager {
  start(): Promise<void>;
  stop(): Promise<void>;
  lock(key: string): Lock;
  readonly ready: boolean;
}

export interface LockDiagnosticsSnapshot {
  readonly totalAcquireAttempts: number;
  readonly successfulAcquisitions: number;
  readonly failedAcquisitions: number;
  readonly acquisitionTimeouts: number;
  readonly cancellations: number;
  readonly renewals: number;
  readonly failedRenewals: number;
  readonly releases: number;
  readonly failedReleases: number;
  readonly expirations: number;
  readonly contentionCount: number;
  readonly averageAcquireLatencyMs: number;
  readonly slowestAcquireLatencyMs: number;
}

// Rate Limiting & Throttling Engine Contracts
export type RateLimitAlgorithm = 'FIXED_WINDOW' | 'SLIDING_WINDOW' | 'TOKEN_BUCKET';

export interface RateLimitPolicy {
  readonly limit: number;
  readonly windowMs: number;
  readonly algorithm: RateLimitAlgorithm;
  readonly burstCapacity?: number | undefined;
}

export interface RateLimitConsumeOptions {
  readonly cost?: number | undefined;
}

export interface RateLimitDecision {
  readonly allowed: boolean;
  readonly limit: number;
  readonly remaining: number;
  readonly consumed: number;
  readonly retryAfterMs?: number | undefined;
  readonly resetAt: number;
}

export interface RateLimitProvider {
  consume(key: string, policy: RateLimitPolicy, cost: number): Promise<RateLimitDecision>;

  reset(key: string): Promise<void>;

  clear(): Promise<void>;
}

export interface RateLimiter {
  check(key: string, options?: RateLimitConsumeOptions): Promise<RateLimitDecision>;

  consume(key: string, options?: RateLimitConsumeOptions): Promise<RateLimitDecision>;

  reset(key: string): Promise<void>;

  namespace(name: string): RateLimiter;
}

export interface RateLimiterManager {
  start(): Promise<void>;
  stop(): Promise<void>;

  limiter(policy: RateLimitPolicy): RateLimiter;

  readonly ready: boolean;
}

export interface RateLimitDiagnosticsSnapshot {
  readonly totalChecks: number;
  readonly allowedRequests: number;
  readonly rejectedRequests: number;
  readonly totalConsumedCost: number;
  readonly throttledRequests: number;
  readonly averageLatencyMs: number;
  readonly slowestLatencyMs: number;
}

// Resilience & Fault-Tolerance Engine Contracts
export interface ResilienceRetryPolicy {
  readonly maxAttempts: number;
  readonly baseDelayMs?: number | undefined;
  readonly multiplier?: number | undefined;
  readonly maxDelayMs?: number | undefined;
  readonly jitter?: number | undefined;
}

export interface ResilienceTimeoutPolicy {
  readonly timeoutMs: number;
}

export interface CircuitBreakerPolicy {
  readonly failureThreshold: number;
  readonly resetTimeoutMs: number;
}

export interface BulkheadPolicy {
  readonly maxConcurrent: number;
  readonly maxQueueSize?: number | undefined;
}

export interface ResilienceExecutionOptions {
  readonly retry?: ResilienceRetryPolicy | undefined;
  readonly timeout?: ResilienceTimeoutPolicy | undefined;
  readonly circuitBreaker?: CircuitBreakerPolicy | undefined;
  readonly bulkhead?: BulkheadPolicy | undefined;
  readonly signal?: AbortSignal | undefined;
  readonly shouldRetry?: ((error: unknown, attempt: number) => boolean) | undefined;
  readonly fallback?:
    ((error: unknown, signal: AbortSignal) => Promise<unknown> | unknown) | undefined;
}

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface ResilienceExecutor {
  execute<T>(
    operation: (signal: AbortSignal) => Promise<T> | T,
    options?: ResilienceExecutionOptions,
  ): Promise<T>;
}

export interface ResilienceManager {
  start(): Promise<void>;
  stop(): Promise<void>;

  executor(): ResilienceExecutor;

  readonly ready: boolean;
}

export interface ResilienceDiagnosticsSnapshot {
  readonly totalExecutions: number;
  readonly successfulExecutions: number;
  readonly failedExecutions: number;
  readonly retryCount: number;
  readonly timeoutCount: number;
  readonly cancellationCount: number;
  readonly fallbackExecutions: number;
  readonly fallbackFailures: number;
  readonly circuitOpenRejections: number;
  readonly circuitTransitions: number;
  readonly bulkheadRejections: number;
  readonly classifierFailures: number;
  readonly averageDurationMs: number;
  readonly slowestDurationMs: number;
}

// Metrics & Telemetry Engine Contracts
export type MetricType = 'COUNTER' | 'GAUGE' | 'HISTOGRAM' | 'TIMER';

export type MetricLabels = Readonly<Record<string, string>>;

export interface HistogramOptions {
  readonly buckets: readonly number[];
}

export interface MetricDefinition {
  readonly name: string;
  readonly type: MetricType;
  readonly description?: string | undefined;
  readonly histogram?: HistogramOptions | undefined;
}

export interface MetricSnapshot {
  readonly name: string;
  readonly type: MetricType;
  readonly labels: MetricLabels;
  readonly value: number;
  readonly count?: number | undefined;
  readonly sum?: number | undefined;
  readonly buckets?: Readonly<Record<string, number>> | undefined;
}

export interface MetricsProvider {
  register(definition: MetricDefinition): void;
  incrementCounter(name: string, value: number, labels?: MetricLabels): void;
  setGauge(name: string, value: number, labels?: MetricLabels): void;
  incrementGauge(name: string, value: number, labels?: MetricLabels): void;
  observeHistogram(name: string, value: number, labels?: MetricLabels): void;
  snapshot(): Promise<readonly MetricSnapshot[]>;
  reset(name?: string): Promise<void>;
  clear(): Promise<void>;
}

export interface MetricTimer {
  stop(): number;
}

export interface Metrics {
  register(definition: MetricDefinition): void;
  counter(
    name: string,
    labels?: MetricLabels,
  ): {
    increment(value?: number): void;
  };
  gauge(
    name: string,
    labels?: MetricLabels,
  ): {
    set(value: number): void;
    increment(value?: number): void;
    decrement(value?: number): void;
  };
  histogram(
    name: string,
    labels?: MetricLabels,
  ): {
    observe(value: number): void;
  };
  timer(name: string, labels?: MetricLabels): MetricTimer;
  snapshot(): Promise<readonly MetricSnapshot[]>;
  reset(name?: string): Promise<void>;
  clear(): Promise<void>;
}

export interface MetricsManager {
  start(): Promise<void>;
  stop(): Promise<void>;
  readonly ready: boolean;
  metrics(): Metrics;
}

export interface MetricsDiagnosticsSnapshot {
  readonly totalRegistrations: number;
  readonly registrationFailures: number;
  readonly totalCounterUpdates: number;
  readonly totalGaugeUpdates: number;
  readonly totalHistogramObservations: number;
  readonly totalTimerObservations: number;
  readonly cardinalityRejections: number;
  readonly providerFailures: number;
  readonly averageOperationLatencyMs: number;
  readonly slowestOperationLatencyMs: number;
}

// Distributed Tracing & Correlation Context Engine Contracts
export interface TraceContext {
  readonly traceId: string;
  readonly spanId: string;
  readonly parentSpanId?: string | undefined;
  readonly sampled: boolean;
}

export type SpanStatus = 'UNSET' | 'OK' | 'ERROR' | 'CANCELLED';

export type SpanState = 'CREATED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface SpanEvent {
  readonly name: string;
  readonly timestamp: number;
  readonly attributes?: Readonly<Record<string, unknown>> | undefined;
}

export interface SpanLink {
  readonly traceId: string;
  readonly spanId: string;
  readonly attributes?: Readonly<Record<string, unknown>> | undefined;
}

export interface SpanSnapshot {
  readonly traceId: string;
  readonly spanId: string;
  readonly parentSpanId?: string | undefined;
  readonly name: string;
  readonly state: SpanState;
  readonly status: SpanStatus;
  readonly sampled: boolean;
  readonly startTime: number;
  readonly endTime?: number | undefined;
  readonly durationMs?: number | undefined;
  readonly attributes: Readonly<Record<string, unknown>>;
  readonly events: readonly SpanEvent[];
  readonly links: readonly SpanLink[];
}

export interface TraceSnapshot {
  readonly traceId: string;
  readonly sampled: boolean;
  readonly spans: readonly SpanSnapshot[];
}

export interface Span {
  readonly context: TraceContext;
  setAttribute(key: string, value: unknown): Span;
  setAttributes(attributes: Readonly<Record<string, unknown>>): Span;
  addEvent(name: string, attributes?: Readonly<Record<string, unknown>>): Span;
  addLink(context: TraceContext, attributes?: Readonly<Record<string, unknown>>): Span;
  setStatus(status: SpanStatus): Span;
  end(status?: SpanStatus): void;
  snapshot(): SpanSnapshot;
  readonly ended: boolean;
}

export interface TraceProvider {
  record(span: SpanSnapshot): Promise<void>;
  snapshot(traceId?: string): Promise<readonly SpanSnapshot[]>;
  clear(): Promise<void>;
}

export interface TraceStartOptions {
  readonly sampled?: boolean | undefined;
  readonly attributes?: Readonly<Record<string, unknown>> | undefined;
}

export interface TraceManager {
  start(): Promise<void>;
  stop(): Promise<void>;
  startTrace(name: string, options?: TraceStartOptions): Span;
  startSpan(name: string, parent?: TraceContext): Span;
  withContext<T>(context: TraceContext, fn: () => Promise<T> | T): Promise<T>;
  current(): TraceContext | undefined;
  readonly ready: boolean;
}

export interface TraceDiagnosticsSnapshot {
  readonly totalTraces: number;
  readonly totalSpans: number;
  readonly completedSpans: number;
  readonly failedSpans: number;
  readonly cancelledSpans: number;
  readonly activeSpans: number;
  readonly providerFailures: number;
  readonly attributeLimitRejections: number;
  readonly eventLimitRejections: number;
  readonly linkLimitRejections: number;
  readonly averageDurationMs: number;
  readonly slowestDurationMs: number;
}

// Application Execution Context Engine Contracts
export type ExecutionState = 'CREATED' | 'ACTIVE' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface ExecutionContext {
  readonly executionId: string;
  readonly state: ExecutionState;
  readonly parentExecutionId?: string | undefined;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly signal: AbortSignal;
  readonly createdAt: number;
  readonly startedAt?: number | undefined;
  readonly completedAt?: number | undefined;
  readonly durationMs?: number | undefined;

  start(): void;
  complete(): void;
  fail(): void;
  cancel(): void;

  child(metadata?: Readonly<Record<string, unknown>>): ExecutionContext;
}

export interface ExecutionContextOptions {
  readonly parent?: ExecutionContext | undefined;
  readonly signal?: AbortSignal | undefined;
  readonly metadata?: Readonly<Record<string, unknown>> | undefined;
  readonly autoStart?: boolean | undefined;
}

export interface ExecutionContextManager {
  start(): Promise<void>;
  stop(): Promise<void>;

  create(options?: ExecutionContextOptions): ExecutionContext;

  current(): ExecutionContext | undefined;

  run<T>(context: ExecutionContext, callback: () => T | Promise<T>): T | Promise<T>;

  readonly ready: boolean;
}

export interface ExecutionDiagnosticsSnapshot {
  readonly totalContexts: number;
  readonly activeContexts: number;
  readonly completedContexts: number;
  readonly failedContexts: number;
  readonly cancelledContexts: number;
  readonly childContexts: number;
  readonly cancellationCount: number;
  readonly metadataRejections: number;
  readonly averageExecutionDurationMs: number;
  readonly slowestExecutionDurationMs: number;
}

// Application Execution Pipeline Engine Contracts
export type ExecutionHandler<TInput = unknown, TResult = unknown> = (
  input: TInput,
  context: ExecutionContext,
) => Promise<TResult> | TResult;

export interface ExecutionMiddleware<TInput = unknown, TResult = unknown> {
  execute(input: TInput, context: ExecutionContext, next: () => Promise<TResult>): Promise<TResult>;
}

export interface ExecutionResult<TResult = unknown> {
  readonly success: boolean;
  readonly value?: TResult | undefined;
  readonly error?: unknown;
  readonly executionId: string;
  readonly durationMs: number;
  readonly state: 'COMPLETED' | 'FAILED' | 'CANCELLED';
}

export interface ExecutionOptions {
  readonly context?: ExecutionContext | undefined;
}

export interface ExecutionEngine {
  start(): Promise<void>;
  stop(): Promise<void>;

  use<TInput = unknown, TResult = unknown>(middleware: ExecutionMiddleware<TInput, TResult>): void;

  execute<TInput = unknown, TResult = unknown>(
    input: TInput,
    handler: ExecutionHandler<TInput, TResult>,
    options?: ExecutionOptions,
  ): Promise<ExecutionResult<TResult>>;

  readonly ready: boolean;
}

export interface ExecutionEngineDiagnosticsSnapshot {
  readonly totalExecutions: number;
  readonly completedExecutions: number;
  readonly failedExecutions: number;
  readonly cancelledExecutions: number;
  readonly shortCircuitedExecutions: number;
  readonly middlewareExecutions: number;
  readonly middlewareFailures: number;
  readonly handlerExecutions: number;
  readonly averageDurationMs: number;
  readonly slowestDurationMs: number;
  readonly activeExecutions: number;
}

// Application Middleware & Interceptor Contracts
export interface Interceptor<TInput = unknown, TResult = unknown> {
  intercept(
    input: TInput,
    context: ExecutionContext,
    next: () => Promise<TResult>,
  ): Promise<TResult> | TResult;
}

export interface InterceptorOptions {
  readonly priority?: number | undefined;
}

export interface InterceptorResult<TResult = unknown> {
  readonly value: TResult;
  readonly intercepted: boolean;
  readonly executionId: string;
  readonly durationMs: number;
}

export interface InterceptorEngine {
  start(): Promise<void>;
  stop(): Promise<void>;

  use<TInput = unknown, TResult = unknown>(
    interceptor: Interceptor<TInput, TResult>,
    options?: InterceptorOptions,
  ): void;

  execute<TInput = unknown, TResult = unknown>(
    input: TInput,
    handler: (input: TInput, context: ExecutionContext) => Promise<TResult> | TResult,
    options?: {
      readonly context?: ExecutionContext | undefined;
    },
  ): Promise<InterceptorResult<TResult>>;

  readonly ready: boolean;
}

export interface InterceptorDiagnosticsSnapshot {
  readonly totalExecutions: number;
  readonly completedExecutions: number;
  readonly failedExecutions: number;
  readonly shortCircuitedExecutions: number;
  readonly interceptorExecutions: number;
  readonly interceptorFailures: number;
  readonly handlerExecutions: number;
  readonly averageDurationMs: number;
  readonly slowestDurationMs: number;
  readonly activeExecutions: number;
}

// Application Command & Handler Dispatch Contracts
export interface Command<TPayload = unknown> {
  readonly type: string;
  readonly payload: TPayload;
}

export interface CommandHandler<TPayload = unknown, TResult = unknown> {
  execute(payload: TPayload, context: ExecutionContext): Promise<TResult> | TResult;
}

export interface DispatchOptions {
  readonly context?: ExecutionContext | undefined;
}

export interface DispatchResult<TResult = unknown> {
  readonly success: boolean;
  readonly value?: TResult | undefined;
  readonly error?: unknown;
  readonly commandType: string;
  readonly executionId: string;
  readonly durationMs: number;
  readonly state: 'COMPLETED' | 'FAILED' | 'CANCELLED';
}

export interface Dispatcher {
  start(): Promise<void>;
  stop(): Promise<void>;

  register<TPayload = unknown, TResult = unknown>(
    type: string,
    handler: CommandHandler<TPayload, TResult>,
  ): void;

  dispatch<TPayload = unknown, TResult = unknown>(
    command: Command<TPayload>,
    options?: DispatchOptions,
  ): Promise<DispatchResult<TResult>>;

  readonly ready: boolean;
}

export interface DispatchDiagnosticsSnapshot {
  readonly totalDispatches: number;
  readonly completedDispatches: number;
  readonly failedDispatches: number;
  readonly cancelledDispatches: number;
  readonly handlerNotFound: number;
  readonly registrationFailures: number;
  readonly handlerExecutions: number;
  readonly handlerFailures: number;
  readonly averageDurationMs: number;
  readonly slowestDurationMs: number;
  readonly activeDispatches: number;
}

// Application Query & Handler Resolution Contracts
export interface Query<TPayload = unknown> {
  readonly type: string;
  readonly payload: TPayload;
}

export interface QueryHandler<TPayload = unknown, TResult = unknown> {
  execute(payload: TPayload, context: ExecutionContext): Promise<TResult> | TResult;
}

export interface QueryOptions {
  readonly context?: ExecutionContext | undefined;
}

export interface QueryResult<TResult = unknown> {
  readonly success: boolean;
  readonly value?: TResult | undefined;
  readonly error?: unknown;
  readonly queryType: string;
  readonly executionId: string;
  readonly durationMs: number;
  readonly state: 'COMPLETED' | 'FAILED' | 'CANCELLED';
}

export interface QueryBus {
  start(): Promise<void>;
  stop(): Promise<void>;

  register<TPayload = unknown, TResult = unknown>(
    type: string,
    handler: QueryHandler<TPayload, TResult>,
  ): void;

  query<TPayload = unknown, TResult = unknown>(
    query: Query<TPayload>,
    options?: QueryOptions,
  ): Promise<QueryResult<TResult>>;

  readonly ready: boolean;
}

export interface QueryDiagnosticsSnapshot {
  readonly totalQueries: number;
  readonly completedQueries: number;
  readonly failedQueries: number;
  readonly cancelledQueries: number;
  readonly handlerNotFound: number;
  readonly registrationFailures: number;
  readonly handlerExecutions: number;
  readonly handlerFailures: number;
  readonly averageDurationMs: number;
  readonly slowestDurationMs: number;
  readonly activeQueries: number;
}

// Application Service & Use-Case Orchestration Contracts
export interface ApplicationService<TInput = unknown, TResult = unknown> {
  execute(input: TInput, context: ExecutionContext): Promise<TResult> | TResult;
}

export interface ApplicationServiceOptions {
  readonly context?: ExecutionContext | undefined;
}

export interface ApplicationResult<TResult = unknown> {
  readonly success: boolean;
  readonly value?: TResult | undefined;
  readonly error?: unknown;
  readonly serviceType: string;
  readonly executionId: string;
  readonly durationMs: number;
  readonly state: 'COMPLETED' | 'FAILED' | 'CANCELLED';
}

export interface ApplicationManager {
  start(): Promise<void>;
  stop(): Promise<void>;

  register<TInput = unknown, TResult = unknown>(
    type: string,
    service: ApplicationService<TInput, TResult>,
  ): void;

  execute<TInput = unknown, TResult = unknown>(
    type: string,
    input: TInput,
    options?: ApplicationServiceOptions,
  ): Promise<ApplicationResult<TResult>>;

  readonly ready: boolean;
}

export interface ApplicationDiagnosticsSnapshot {
  readonly totalExecutions: number;
  readonly completedExecutions: number;
  readonly failedExecutions: number;
  readonly cancelledExecutions: number;
  readonly serviceNotFound: number;
  readonly registrationFailures: number;
  readonly serviceExecutions: number;
  readonly serviceFailures: number;
  readonly nestedOperations: number;
  readonly averageDurationMs: number;
  readonly slowestDurationMs: number;
  readonly activeExecutions: number;
}

// Application Event & Handler Dispatch Contracts
export type EventExecutionMode = 'SEQUENTIAL' | 'CONCURRENT';
export type EventFailureStrategy = 'CONTINUE' | 'STOP';

export interface Event<TPayload = unknown> {
  readonly type: string;
  readonly payload: TPayload;
}

export interface EventHandler<TPayload = unknown> {
  handle(event: Event<TPayload>, context: ExecutionContext): Promise<void> | void;
}

export interface EventHandlerOptions {
  readonly priority?: number | undefined;
}

export interface EventPublishOptions {
  readonly context?: ExecutionContext | undefined;
  readonly mode?: EventExecutionMode | undefined;
  readonly failureStrategy?: EventFailureStrategy | undefined;
}

export interface EventHandlerResult {
  readonly handlerName?: string | undefined;
  readonly success: boolean;
  readonly error?: unknown | undefined;
  readonly durationMs: number;
}

export interface EventPublishResult {
  readonly success: boolean;
  readonly eventType: string;
  readonly executionId: string;
  readonly durationMs: number;
  readonly handlerCount: number;
  readonly successfulHandlers: number;
  readonly failedHandlers: number;
  readonly handlerResults: readonly EventHandlerResult[];
  readonly state: 'COMPLETED' | 'FAILED' | 'CANCELLED';
}

export interface EventPublisher {
  start(): Promise<void>;
  stop(): Promise<void>;

  register<TPayload = unknown>(
    type: string,
    handler: EventHandler<TPayload>,
    options?: EventHandlerOptions,
  ): void;

  publish<TPayload = unknown>(
    event: Event<TPayload>,
    options?: EventPublishOptions,
  ): Promise<EventPublishResult>;

  readonly ready: boolean;
}

export interface EventDiagnosticsSnapshot {
  readonly totalPublications: number;
  readonly successfulPublications: number;
  readonly failedPublications: number;
  readonly cancelledPublications: number;
  readonly totalHandlersExecuted: number;
  readonly successfulHandlers: number;
  readonly failedHandlers: number;
  readonly handlerNotFound: number;
  readonly registrationFailures: number;
  readonly nestedPublications: number;
  readonly averageDurationMs: number;
  readonly slowestDurationMs: number;
  readonly activePublications: number;
}

// Application Error Handling & Classification Contracts
export type ApplicationErrorCategory =
  | 'VALIDATION'
  | 'AUTHENTICATION'
  | 'AUTHORIZATION'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'TIMEOUT'
  | 'CANCELLED'
  | 'RATE_LIMITED'
  | 'DEPENDENCY'
  | 'INTERNAL'
  | 'UNKNOWN';

export interface ApplicationError {
  readonly name: string;
  readonly message: string;
  readonly code: string;
  readonly category: ApplicationErrorCategory;
  readonly details?: unknown;
  readonly stack?: string | undefined;
  readonly cause?: unknown;
  readonly timestamp: number;
}

export type ErrorHandlerAction = 'HANDLE' | 'TRANSFORM' | 'RECOVER' | 'RETHROW';

export interface ErrorHandlerResult<TResult = unknown> {
  readonly action: ErrorHandlerAction;
  readonly result?: TResult | undefined;
  readonly transformedError?: unknown | undefined;
  readonly error?: unknown | undefined;
}

export interface ErrorHandler<TError = unknown, TResult = unknown> {
  handle(
    error: ApplicationError,
    context: ExecutionContext,
    rawError?: TError,
  ): Promise<ErrorHandlerResult<TResult>> | ErrorHandlerResult<TResult>;
}

export interface ErrorHandlerOptions {
  readonly id?: string | undefined;
  readonly priority?: number | undefined;
  readonly category?: ApplicationErrorCategory | undefined;
  readonly code?: string | undefined;
}

export interface ErrorProcessingOptions {
  readonly context?: ExecutionContext | undefined;
  readonly includeStack?: boolean | undefined;
  readonly maxCauseDepth?: number | undefined;
}

export type ErrorProcessingState =
  'HANDLED' | 'TRANSFORMED' | 'RECOVERED' | 'RETHROWN' | 'UNRESOLVED' | 'CANCELLED';

export interface ErrorProcessingResult<TResult = unknown> {
  readonly state: ErrorProcessingState;
  readonly error: ApplicationError;
  readonly result?: TResult | undefined;
  readonly transformedError?: ApplicationError | undefined;
  readonly executionId: string;
  readonly durationMs: number;
  readonly matchedHandlers: number;
}

export interface ErrorHandlingEngine {
  start(): Promise<void>;
  stop(): Promise<void>;

  registerHandler<TError = unknown, TResult = unknown>(
    handler: ErrorHandler<TError, TResult>,
    options?: ErrorHandlerOptions,
  ): void;

  process<TResult = unknown>(
    error: unknown,
    options?: ErrorProcessingOptions,
  ): Promise<ErrorProcessingResult<TResult>>;

  classify(error: unknown): ApplicationErrorCategory;
  normalize(error: unknown, options?: ErrorProcessingOptions): ApplicationError;

  readonly ready: boolean;
}

export interface ErrorHandlingDiagnosticsSnapshot {
  readonly totalErrors: number;
  readonly handledErrors: number;
  readonly transformedErrors: number;
  readonly recoveredErrors: number;
  readonly rethrownErrors: number;
  readonly cancelledErrors: number;
  readonly unknownErrors: number;
  readonly classificationFailures: number;
  readonly normalizationFailures: number;
  readonly sanitizationFailures: number;
  readonly handlerExecutions: number;
  readonly handlerFailures: number;
  readonly averageDurationMs: number;
  readonly slowestDurationMs: number;
  readonly activeProcessing: number;
}

// Application Kernel & Lifecycle Coordination Contracts
export type KernelState = 'CREATED' | 'INITIALIZING' | 'READY' | 'STOPPING' | 'STOPPED';

export interface KernelComponent {
  readonly id: string;
  readonly name?: string | undefined;
  readonly dependencies?: readonly string[] | undefined;
  start(): Promise<void> | void;
  stop(): Promise<void> | void;
  readonly ready: boolean;
}

export interface KernelComponentOptions {
  readonly id?: string | undefined;
  readonly name?: string | undefined;
  readonly dependencies?: readonly string[] | undefined;
}

export interface KernelStartOptions {
  readonly timeoutMs?: number | undefined;
}

export interface KernelStopOptions {
  readonly timeoutMs?: number | undefined;
  readonly force?: boolean | undefined;
  readonly graceful?: boolean | undefined;
}

export interface KernelOperationOptions {
  readonly context?: ExecutionContext | undefined;
  readonly timeoutMs?: number | undefined;
}

export interface KernelDiagnosticsSnapshot {
  readonly startAttempts: number;
  readonly successfulStarts: number;
  readonly failedStarts: number;
  readonly stopAttempts: number;
  readonly successfulStops: number;
  readonly failedStops: number;
  readonly totalOperations: number;
  readonly completedOperations: number;
  readonly failedOperations: number;
  readonly cancelledOperations: number;
  readonly activeOperations: number;
  readonly startupDurationMs: number;
  readonly shutdownDurationMs: number;
  readonly averageOperationDurationMs: number;
  readonly slowestOperationDurationMs: number;
  readonly componentStartFailures: number;
  readonly componentStopFailures: number;
  readonly registrationFailures: number;
  readonly dependencyFailures: number;
}

export interface ApplicationKernel {
  start(options?: KernelStartOptions): Promise<void>;
  stop(options?: KernelStopOptions): Promise<void>;

  registerComponent(component: KernelComponent, options?: KernelComponentOptions): void;

  dispatch<TPayload = unknown, TResult = unknown>(
    command: Command<TPayload>,
    options?: DispatchOptions,
  ): Promise<DispatchResult<TResult>>;

  query<TPayload = unknown, TResult = unknown>(
    query: Query<TPayload>,
    options?: QueryOptions,
  ): Promise<QueryResult<TResult>>;

  publish<TPayload = unknown>(
    event: Event<TPayload>,
    options?: EventPublishOptions,
  ): Promise<EventPublishResult>;

  executeService<TInput = unknown, TResult = unknown>(
    serviceName: string,
    input: TInput,
    options?: ApplicationServiceOptions,
  ): Promise<ApplicationResult<TResult>>;

  execute<TInput = unknown, TOutput = unknown>(
    input: TInput,
    handler: ExecutionHandler<TInput, TOutput>,
    options?: ExecutionOptions,
  ): Promise<ExecutionResult<TOutput>>;

  readonly state: KernelState;
  readonly ready: boolean;
}

// Application Lifecycle Hooks & Execution Hooks Contracts
export type HookType =
  | 'BEFORE_START'
  | 'AFTER_START'
  | 'BEFORE_STOP'
  | 'AFTER_STOP'
  | 'BEFORE_EXECUTE'
  | 'AFTER_EXECUTE'
  | 'ON_ERROR';

export type HookState = 'CREATED' | 'READY' | 'STOPPING' | 'STOPPED';

export type HookFailureStrategy = 'CONTINUE' | 'STOP' | 'FAIL_FAST';

export interface HookExecutionContext {
  readonly context?: ExecutionContext | undefined;
}

export interface Hook<TPayload = unknown, TResult = unknown> {
  readonly id: string;
  readonly type: HookType;
  readonly priority?: number | undefined;
  execute(payload: TPayload, context?: ExecutionContext): Promise<TResult> | TResult;
}

export interface HookOptions {
  readonly priority?: number | undefined;
  readonly failureStrategy?: HookFailureStrategy | undefined;
}

export interface HookDispatchOptions {
  readonly context?: ExecutionContext | undefined;
  readonly failureStrategy?: HookFailureStrategy | undefined;
  readonly timeoutMs?: number | undefined;
}

export interface HookExecutionResult<TResult = unknown> {
  readonly hookId: string;
  readonly type: HookType;
  readonly state: 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'SKIPPED';
  readonly success: boolean;
  readonly value?: TResult | undefined;
  readonly error?: unknown | undefined;
  readonly durationMs: number;
}

export interface HookBatchResult<TResult = unknown> {
  readonly type: HookType;
  readonly success: boolean;
  readonly results: readonly HookExecutionResult<TResult>[];
  readonly totalHooks: number;
  readonly executedHooks: number;
  readonly failedHooks: number;
  readonly skippedHooks: number;
  readonly cancelledHooks: number;
  readonly durationMs: number;
}

export interface HookDiagnosticsSnapshot {
  readonly totalHookExecutions: number;
  readonly successfulHookExecutions: number;
  readonly failedHookExecutions: number;
  readonly cancelledHookExecutions: number;
  readonly skippedHookExecutions: number;
  readonly beforeStartExecutions: number;
  readonly afterStartExecutions: number;
  readonly beforeStopExecutions: number;
  readonly afterStopExecutions: number;
  readonly beforeExecuteExecutions: number;
  readonly afterExecuteExecutions: number;
  readonly errorHookExecutions: number;
  readonly averageDurationMs: number;
  readonly slowestDurationMs: number;
  readonly activeHookExecutions: number;
  readonly registrationFailures: number;
}

export interface HookManager {
  start(): Promise<void>;
  stop(): Promise<void>;

  register<TPayload = unknown, TResult = unknown>(
    hook: Hook<TPayload, TResult>,
    options?: HookOptions,
  ): void;

  execute<TPayload = unknown, TResult = unknown>(
    type: HookType,
    payload?: TPayload,
    options?: HookDispatchOptions,
  ): Promise<HookBatchResult<TResult>>;

  readonly ready: boolean;
  readonly state: HookState;
}

// Application Integration & End-to-End Coordination Contracts
export type IntegrationState = 'CREATED' | 'INITIALIZING' | 'READY' | 'STOPPING' | 'STOPPED';

export interface IntegrationDiagnosticsSnapshot {
  readonly startupAttempts: number;
  readonly successfulStarts: number;
  readonly failedStarts: number;
  readonly shutdownAttempts: number;
  readonly successfulStops: number;
  readonly failedStops: number;
  readonly totalOperations: number;
  readonly completedOperations: number;
  readonly failedOperations: number;
  readonly cancelledOperations: number;
  readonly dispatchOperations: number;
  readonly queryOperations: number;
  readonly eventOperations: number;
  readonly serviceOperations: number;
  readonly executionOperations: number;
  readonly integrationFailures: number;
  readonly averageOperationDurationMs: number;
  readonly slowestOperationDurationMs: number;
  readonly activeOperations: number;
}

export interface ApplicationIntegration {
  start(): Promise<void>;
  stop(): Promise<void>;

  dispatch<TPayload = unknown, TResult = unknown>(
    command: Command<TPayload>,
    options?: DispatchOptions,
  ): Promise<DispatchResult<TResult>>;

  query<TPayload = unknown, TResult = unknown>(
    query: Query<TPayload>,
    options?: QueryOptions,
  ): Promise<QueryResult<TResult>>;

  publish<TPayload = unknown>(
    event: Event<TPayload>,
    options?: EventPublishOptions,
  ): Promise<EventPublishResult>;

  executeService<TInput = unknown, TResult = unknown>(
    serviceName: string,
    input: TInput,
    options?: ApplicationServiceOptions,
  ): Promise<ApplicationResult<TResult>>;

  execute<TInput = unknown, TOutput = unknown>(
    input: TInput,
    handler: ExecutionHandler<TInput, TOutput>,
    options?: ExecutionOptions,
  ): Promise<ExecutionResult<TOutput>>;

  readonly state: IntegrationState;
  readonly ready: boolean;
}

// Transport Contracts & Adapter Abstraction Layer
export type TransportState = 'CREATED' | 'READY' | 'STOPPING' | 'STOPPED';

export type TransportCapability =
  'REQUEST' | 'RESPONSE' | 'STREAMING' | 'BIDIRECTIONAL' | 'CANCELLATION' | 'METADATA';

export type TransportMetadata = Record<string, unknown>;

export interface TransportRequest<TPayload = unknown> {
  readonly payload: TPayload;
  readonly metadata: TransportMetadata;
  readonly context?: ExecutionContext | undefined;
}

export interface TransportResponse<TBody = unknown> {
  readonly success: boolean;
  readonly body?: TBody | undefined;
  readonly error?: unknown;
  readonly metadata?: TransportMetadata | undefined;
}

export interface TransportContext {
  readonly executionContext: ExecutionContext;
  readonly transportType: string;
  readonly metadata: TransportMetadata;
}

export interface TransportAdapter<TRequest = unknown, TResponse = unknown> {
  readonly id: string;
  readonly name: string;
  readonly priority?: number | undefined;
  readonly capabilities: readonly TransportCapability[];
  handle?(
    request: TransportRequest<TRequest>,
    context: TransportContext,
  ): Promise<TransportResponse<TResponse>> | TransportResponse<TResponse>;
}

export interface TransportAdapterOptions {
  readonly priority?: number | undefined;
  readonly capabilities?: readonly TransportCapability[] | undefined;
}

export interface TransportExecutionOptions {
  readonly context?: ExecutionContext | undefined;
  readonly timeoutMs?: number | undefined;
  readonly adapterId?: string | undefined;
}

export interface TransportResult<TResponse = unknown> {
  readonly success: boolean;
  readonly response?: TransportResponse<TResponse> | undefined;
  readonly error?: unknown;
  readonly durationMs: number;
}

export interface TransportDiagnosticsSnapshot {
  readonly adapterRegistrations: number;
  readonly registrationFailures: number;
  readonly totalRequests: number;
  readonly successfulRequests: number;
  readonly failedRequests: number;
  readonly cancelledRequests: number;
  readonly activeRequests: number;
  readonly adapterResolutions: number;
  readonly resolutionFailures: number;
  readonly averageDurationMs: number;
  readonly slowestDurationMs: number;
}

export interface TransportManager {
  start(): Promise<void>;
  stop(): Promise<void>;

  registerAdapter<TRequest = unknown, TResponse = unknown>(
    adapter: TransportAdapter<TRequest, TResponse>,
    options?: TransportAdapterOptions,
  ): void;

  resolveAdapter<TRequest = unknown, TResponse = unknown>(
    id: string,
  ): TransportAdapter<TRequest, TResponse>;

  resolveByCapability(
    capability: TransportCapability,
  ): readonly TransportAdapter<unknown, unknown>[];

  execute<TRequest = unknown, TResponse = unknown>(
    request: TransportRequest<TRequest>,
    options?: TransportExecutionOptions,
  ): Promise<TransportResult<TResponse>>;

  readonly state: TransportState;
  readonly ready: boolean;
  getDiagnostics(): TransportDiagnosticsSnapshot;
  resetDiagnostics(): void;
}

// =========================================================================
// Phase 8.2: HTTP Transport Adapter & Request Execution Engine Contracts
// =========================================================================

export type HttpHeaders = Record<string, string | readonly string[] | unknown>;

export type HttpQuery = Record<string, string | readonly string[] | unknown | undefined>;

export type HttpPathParameters = Record<string, string | unknown>;

export interface HttpRequest<TBody = unknown> {
  readonly method: HttpMethod | string;
  readonly url: string;
  readonly path: string;
  readonly headers: HttpHeaders;
  readonly query?: HttpQuery | undefined;
  readonly pathParameters?: HttpPathParameters | undefined;
  readonly parameters?: Readonly<Record<string, unknown>> | undefined;
  readonly cookies?: Record<string, string> | Readonly<Record<string, unknown>> | undefined;
  readonly body?: TBody | undefined;
  readonly metadata?: Record<string, unknown> | undefined;
  readonly signal?: AbortSignal | undefined;
  readonly remoteAddress?: string | undefined;
  readonly protocol?: string | undefined;
  readonly requestId?: string | undefined;
}

export interface HttpResponse<TBody = unknown> {
  readonly status: number;
  readonly headers: HttpHeaders;
  readonly body?: TBody | undefined;
  readonly cookies?: Record<string, string> | Readonly<Record<string, unknown>> | undefined;
  readonly metadata?: Record<string, unknown> | undefined;
  readonly contentType?: string | undefined;
}

export interface HttpRequestOptions {
  readonly timeoutMs?: number | undefined;
  readonly context?: ExecutionContext | undefined;
  readonly metadata?: Record<string, unknown> | undefined;
}

export interface HttpResponseOptions {
  readonly defaultStatus?: number | undefined;
  readonly includeErrorDetails?: boolean | undefined;
  readonly cancellationStatus?: number | undefined;
}

export interface HttpAdapter<TBodyReq = unknown, TBodyRes = unknown> extends TransportAdapter<
  HttpRequest<TBodyReq>,
  HttpResponse<TBodyRes>
> {
  readonly defaultOptions?: HttpRequestOptions | undefined;
}

export interface HttpDiagnosticsSnapshot {
  readonly totalRequests: number;
  readonly successfulRequests: number;
  readonly failedRequests: number;
  readonly cancelledRequests: number;
  readonly activeRequests: number;
  readonly validationFailures: number;
  readonly mappingFailures: number;
  readonly responseMappings: number;
  readonly averageDurationMs: number;
  readonly slowestDurationMs: number;
}

// ============================================================================
// HTTP ROUTING CONTRACTS
// ============================================================================

export interface HttpRoute {
  readonly id: string;
  readonly method: HttpMethod;
  readonly path: string;
  readonly operation: string;
  readonly priority?: number | undefined;
  readonly metadata?: Readonly<Record<string, unknown>> | undefined;
}

export interface HttpRouteOptions {
  readonly priority?: number | undefined;
  readonly metadata?: Record<string, unknown> | undefined;
}

export interface HttpRouteMatch {
  readonly routeId: string;
  readonly method: HttpMethod;
  readonly path: string;
  readonly operation: string;
  readonly parameters: Readonly<Record<string, string>>;
  readonly metadata?: Readonly<Record<string, unknown>> | undefined;
}

export interface HttpRouteRegistry {
  readonly size: number;
  readonly locked: boolean;
  register(route: HttpRoute, options?: HttpRouteOptions): void;
  get(routeId: string): HttpRoute | undefined;
  list(): readonly HttpRoute[];
  lock(): void;
}

export interface HttpRouteResolver {
  resolve(method: HttpMethod, path: string): HttpRouteMatch | undefined;
  match(request: HttpRequest): HttpRouteMatch | undefined;
}

export interface HttpRoutingOptions {
  readonly strictTrailingSlash?: boolean | undefined;
  readonly caseSensitive?: boolean | undefined;
  readonly defaultPriority?: number | undefined;
}

export interface HttpRoutingResult {
  readonly matched: boolean;
  readonly match?: HttpRouteMatch | undefined;
  readonly error?: unknown;
}

export interface HttpRoutingDiagnosticsSnapshot {
  readonly totalRouteResolutions: number;
  readonly successfulResolutions: number;
  readonly routeNotFound: number;
  readonly methodNotAllowed: number;
  readonly parameterExtractionFailures: number;
  readonly registrationFailures: number;
  readonly resolutionFailures: number;
  readonly activeResolutions: number;
  readonly averageResolutionDurationMs: number;
  readonly slowestResolutionDurationMs: number;
}

// ============================================================================
// Phase 8.4: HTTP Middleware & Request Pipeline Engine Contracts
// ============================================================================

export type HttpMiddlewareState = 'CREATED' | 'READY' | 'STOPPING' | 'STOPPED';

export type HttpMiddlewareFailureStrategy = 'CONTINUE' | 'STOP' | 'FAIL_FAST';

export interface HttpMiddlewareRouteInfo {
  readonly id: string;
  readonly method: HttpMethod;
  readonly path: string;
  readonly operation: string;
  readonly metadata?: Readonly<Record<string, unknown>> | undefined;
}

export interface HttpMiddlewareContext<TReq = unknown> {
  readonly request: HttpRequest<TReq>;
  readonly route?: HttpMiddlewareRouteInfo | undefined;
  readonly parameters: Readonly<Record<string, string>>;
  readonly transportContext?: TransportContext | undefined;
  readonly executionContext: ExecutionContext;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export type HttpMiddlewareNext<TResult = unknown> = () => Promise<TResult>;

export interface HttpMiddleware<TContext = HttpMiddlewareContext, TResult = unknown> {
  readonly id: string;
  readonly name?: string | undefined;
  readonly priority?: number | undefined;
  execute(context: TContext, next: HttpMiddlewareNext<TResult>): Promise<TResult> | TResult;
}

export interface HttpMiddlewareOptions {
  readonly priority?: number | undefined;
  readonly enabled?: boolean | undefined;
  readonly failureStrategy?: HttpMiddlewareFailureStrategy | undefined;
  readonly timeoutMs?: number | undefined;
}

export type HttpMiddlewareResultState = 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'SKIPPED';

export interface HttpMiddlewareResult<TResult = unknown> {
  readonly middlewareId: string;
  readonly state: HttpMiddlewareResultState;
  readonly success: boolean;
  readonly value?: TResult | undefined;
  readonly error?: unknown | undefined;
  readonly durationMs: number;
}

export interface HttpMiddlewareBatchResult<TResult = unknown> {
  readonly success: boolean;
  readonly results: readonly HttpMiddlewareResult<TResult>[];
  readonly totalMiddleware: number;
  readonly executedMiddleware: number;
  readonly failedMiddleware: number;
  readonly skippedMiddleware: number;
  readonly cancelledMiddleware: number;
  readonly durationMs: number;
}

export interface HttpMiddlewareDiagnosticsSnapshot {
  readonly totalExecutions: number;
  readonly successfulExecutions: number;
  readonly failedExecutions: number;
  readonly cancelledExecutions: number;
  readonly skippedExecutions: number;
  readonly activeExecutions: number;
  readonly registrationFailures: number;
  readonly averageDurationMs: number;
  readonly slowestDurationMs: number;
}

export interface HttpMiddlewareRegistry {
  readonly size: number;
  readonly locked: boolean;
  register(middleware: HttpMiddleware, options?: HttpMiddlewareOptions): void;
  get(middlewareId: string): HttpMiddleware | undefined;
  list(): readonly HttpMiddleware[];
  lock(): void;
}

export interface HttpMiddlewareResolver {
  resolve(): readonly HttpMiddleware[];
}

// ============================================================================
// Phase 8.5: HTTP Controller & Endpoint Infrastructure Contracts
// ============================================================================

export type HttpControllerResultState = 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'SKIPPED';

export interface HttpControllerContext<TReq = unknown> {
  readonly request: HttpRequest<TReq>;
  readonly route: HttpMiddlewareRouteInfo;
  readonly parameters: Readonly<Record<string, string>>;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly transportContext?: TransportContext | undefined;
  readonly executionContext: ExecutionContext;
}

export interface HttpController<TContext = HttpControllerContext, TResult = unknown> {
  readonly id: string;
  readonly name: string;
  readonly priority?: number | undefined;
  execute(context: TContext): Promise<TResult> | TResult;
}

export interface HttpEndpoint {
  readonly id: string;
  readonly name: string;
  readonly routeId: string;
  readonly operation: string;
  readonly controllerId: string;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly enabled: boolean;
  readonly priority: number;
}

export interface HttpEndpointOptions {
  readonly priority?: number | undefined;
  readonly enabled?: boolean | undefined;
  readonly metadata?: Readonly<Record<string, unknown>> | undefined;
}

export interface HttpControllerResult<TValue = unknown> {
  readonly success: boolean;
  readonly value?: TValue | undefined;
  readonly state: HttpControllerResultState;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly durationMs: number;
}

export interface HttpControllerDiagnosticsSnapshot {
  readonly totalExecutions: number;
  readonly successfulExecutions: number;
  readonly failedExecutions: number;
  readonly cancelledExecutions: number;
  readonly skippedExecutions: number;
  readonly activeExecutions: number;
  readonly registrationFailures: number;
  readonly averageDurationMs: number;
  readonly slowestDurationMs: number;
}

export interface HttpControllerRegistry {
  readonly size: number;
  readonly locked: boolean;
  register(controller: HttpController, priority?: number): void;
  get(controllerId: string): HttpController | undefined;
  has(controllerId: string): boolean;
  lock(): void;
}

export interface HttpEndpointRegistry {
  readonly size: number;
  readonly locked: boolean;
  register(endpoint: HttpEndpoint, options?: HttpEndpointOptions): void;
  get(endpointId: string): HttpEndpoint | undefined;
  getByRouteId(routeId: string): HttpEndpoint | undefined;
  has(endpointId: string): boolean;
  lock(): void;
}

// ============================================================================
// Phase 8.6: HTTP Request Binding & Validation Engine Contracts
// ============================================================================

export type HttpBindingSource = 'PATH' | 'QUERY' | 'HEADER' | 'COOKIE' | 'BODY';

export type HttpValueType =
  'STRING' | 'NUMBER' | 'BOOLEAN' | 'INTEGER' | 'JSON' | 'ARRAY' | 'OBJECT';

export interface HttpBindingDefinition {
  readonly source: HttpBindingSource;
  readonly field?: string | undefined;
  readonly target: string;
  readonly required?: boolean | undefined;
  readonly type?: HttpValueType | undefined;
  readonly defaultValue?: unknown | undefined;
  readonly metadata?: Readonly<Record<string, unknown>> | undefined;
}

export interface HttpBindingContext<TReq = unknown> {
  readonly request: HttpRequest<TReq>;
  readonly route?: HttpMiddlewareRouteInfo | undefined;
  readonly parameters: Readonly<Record<string, string>>;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly executionContext: ExecutionContext;
}

export interface HttpValidationErrorDetail {
  readonly field: string;
  readonly source?: HttpBindingSource | undefined;
  readonly code: string;
  readonly message: string;
}

export interface HttpValidationRule<T = unknown> {
  readonly name: string;
  validate(value: T, context?: HttpBindingContext): boolean | Promise<boolean>;
  readonly message?: string | undefined;
  readonly code?: string | undefined;
}

export interface HttpValidationResult {
  readonly valid: boolean;
  readonly errors: readonly HttpValidationErrorDetail[];
}

export interface HttpBindingResult<T = unknown> {
  readonly success: boolean;
  readonly value?: T | undefined;
  readonly errors: readonly HttpValidationErrorDetail[];
  readonly durationMs: number;
}

export interface HttpBinder<TInput = unknown, TOutput = unknown> {
  readonly id: string;
  bind(
    context: HttpBindingContext<TInput>,
  ): Promise<HttpBindingResult<TOutput>> | HttpBindingResult<TOutput>;
}

export interface HttpValidator<T = unknown> {
  readonly id: string;
  validate(
    value: T,
    context?: HttpBindingContext,
  ): Promise<HttpValidationResult> | HttpValidationResult;
}

export interface HttpBindingDiagnosticsSnapshot {
  readonly totalBindings: number;
  readonly successfulBindings: number;
  readonly failedBindings: number;
  readonly missingValues: number;
  readonly typeFailures: number;
  readonly validationFailures: number;
  readonly transformationFailures: number;
  readonly activeBindings: number;
  readonly averageDurationMs: number;
  readonly slowestDurationMs: number;
}

// ============================================================================
// Phase 8.7: HTTP Response & Serialization Engine Contracts
// ============================================================================

export type HttpCircularReferencePolicy = 'ERROR' | 'SANITIZE';

export interface HttpSerializationContext {
  readonly mediaType: string;
  readonly charset?: string | undefined;
  readonly operation?: string | undefined;
  readonly status?: number | undefined;
  readonly metadata?: Readonly<Record<string, unknown>> | undefined;
}

export interface HttpSerializer<TInput = unknown, TOutput = unknown> {
  readonly id: string;
  readonly name: string;
  readonly priority?: number | undefined;
  readonly mediaTypes: readonly string[];
  serialize(value: TInput, context: HttpSerializationContext): TOutput | Promise<TOutput>;
}

export interface HttpSerializerOptions {
  readonly id?: string | undefined;
  readonly name?: string | undefined;
  readonly priority?: number | undefined;
  readonly mediaTypes?: readonly string[] | undefined;
  readonly enabled?: boolean | undefined;
}

export interface HttpSerializationResult<T = unknown> {
  readonly success: boolean;
  readonly value?: T | undefined;
  readonly serializerId?: string | undefined;
  readonly mediaType?: string | undefined;
  readonly durationMs: number;
  readonly error?: unknown | undefined;
}

export interface HttpResponseTransformationOptions {
  readonly fieldsToRedact?: readonly string[] | undefined;
  readonly circularPolicy?: HttpCircularReferencePolicy | undefined;
  readonly extraMetadata?: Readonly<Record<string, unknown>> | undefined;
}

export interface HttpResponseTransformer<TInput = unknown, TOutput = unknown> {
  readonly id: string;
  transform(value: TInput, options?: HttpResponseTransformationOptions): TOutput | Promise<TOutput>;
}

export interface HttpResponseDiagnosticsSnapshot {
  readonly totalSerializations: number;
  readonly successfulSerializations: number;
  readonly failedSerializations: number;
  readonly cancelledSerializations: number;
  readonly timeoutSerializations: number;
  readonly activeSerializations: number;
  readonly transformationFailures: number;
  readonly serializerResolutionFailures: number;
  readonly averageDurationMs: number;
  readonly slowestDurationMs: number;
}
