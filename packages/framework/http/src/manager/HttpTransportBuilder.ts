import {
  HttpResponseTransformer,
  HttpSerializer,
  HttpSerializerOptions,
  TransportManager,
} from '@coreforge/contracts';
import { ApplicationIntegration } from '@coreforge/integration';

import { HttpTransportManager } from './HttpTransportManager';
import { HttpSerializationEngine } from '../response/HttpSerializationEngine';
import { HttpSerializerRegistry } from '../response/HttpSerializerRegistry';
import { HttpSerializerResolver } from '../response/HttpSerializerResolver';
import { HttpJsonSerializer } from '../response/serializers/HttpJsonSerializer';
import { HttpRouter } from '../routing/HttpRouter';
import { HttpErrorMappingOptions } from '../types/httpTypes';

export interface SerializerRegistrationItem {
  readonly serializer: HttpSerializer;
  readonly options?: HttpSerializerOptions | undefined;
}

export class HttpTransportBuilder {
  private readonly _application?: ApplicationIntegration | undefined;
  private readonly _transportManager?: TransportManager | undefined;
  private readonly _defaultTimeoutMs?: number | undefined;
  private readonly _errorMappingOptions?: HttpErrorMappingOptions | undefined;
  private readonly _autoStart?: boolean | undefined;
  private readonly _router?: HttpRouter | undefined;
  private readonly _serializers: readonly SerializerRegistrationItem[];
  private readonly _responseTransformer?: HttpResponseTransformer | undefined;

  private constructor(
    application?: ApplicationIntegration,
    transportManager?: TransportManager,
    defaultTimeoutMs?: number,
    errorMappingOptions?: HttpErrorMappingOptions,
    autoStart?: boolean,
    router?: HttpRouter,
    serializers: readonly SerializerRegistrationItem[] = [],
    responseTransformer?: HttpResponseTransformer,
  ) {
    this._application = application;
    this._transportManager = transportManager;
    this._defaultTimeoutMs = defaultTimeoutMs;
    this._errorMappingOptions = errorMappingOptions;
    this._autoStart = autoStart;
    this._router = router;
    this._serializers = serializers;
    this._responseTransformer = responseTransformer;
  }

  public static create(): HttpTransportBuilder {
    return new HttpTransportBuilder();
  }

  public withApplication(application: ApplicationIntegration): HttpTransportBuilder {
    return new HttpTransportBuilder(
      application,
      this._transportManager,
      this._defaultTimeoutMs,
      this._errorMappingOptions,
      this._autoStart,
      this._router,
      this._serializers,
      this._responseTransformer,
    );
  }

  public withTransportManager(transportManager: TransportManager): HttpTransportBuilder {
    return new HttpTransportBuilder(
      this._application,
      transportManager,
      this._defaultTimeoutMs,
      this._errorMappingOptions,
      this._autoStart,
      this._router,
      this._serializers,
      this._responseTransformer,
    );
  }

  public withDefaultTimeout(timeoutMs: number): HttpTransportBuilder {
    return new HttpTransportBuilder(
      this._application,
      this._transportManager,
      timeoutMs,
      this._errorMappingOptions,
      this._autoStart,
      this._router,
      this._serializers,
      this._responseTransformer,
    );
  }

  public withErrorMapping(errorMappingOptions: HttpErrorMappingOptions): HttpTransportBuilder {
    return new HttpTransportBuilder(
      this._application,
      this._transportManager,
      this._defaultTimeoutMs,
      errorMappingOptions,
      this._autoStart,
      this._router,
      this._serializers,
      this._responseTransformer,
    );
  }

  public withAutoStart(autoStart = true): HttpTransportBuilder {
    return new HttpTransportBuilder(
      this._application,
      this._transportManager,
      this._defaultTimeoutMs,
      this._errorMappingOptions,
      autoStart,
      this._router,
      this._serializers,
      this._responseTransformer,
    );
  }

  public withRouter(router: HttpRouter): HttpTransportBuilder {
    return new HttpTransportBuilder(
      this._application,
      this._transportManager,
      this._defaultTimeoutMs,
      this._errorMappingOptions,
      this._autoStart,
      router,
      this._serializers,
      this._responseTransformer,
    );
  }

  public withMiddleware(
    middleware: import('@coreforge/contracts').HttpMiddleware,
    options?: import('@coreforge/contracts').HttpMiddlewareOptions,
  ): HttpTransportBuilder {
    const router = this._router ?? new HttpRouter();
    router.use(middleware, options);
    return new HttpTransportBuilder(
      this._application,
      this._transportManager,
      this._defaultTimeoutMs,
      this._errorMappingOptions,
      this._autoStart,
      router,
      this._serializers,
      this._responseTransformer,
    );
  }

  public withController(
    controller: import('@coreforge/contracts').HttpController,
    priority?: number,
  ): HttpTransportBuilder {
    const router = this._router ?? new HttpRouter();
    router.registerController(controller, priority);
    return new HttpTransportBuilder(
      this._application,
      this._transportManager,
      this._defaultTimeoutMs,
      this._errorMappingOptions,
      this._autoStart,
      router,
      this._serializers,
      this._responseTransformer,
    );
  }

  public withEndpoint(
    endpoint: import('@coreforge/contracts').HttpEndpoint,
    options?: import('@coreforge/contracts').HttpEndpointOptions,
  ): HttpTransportBuilder {
    const router = this._router ?? new HttpRouter();
    router.registerEndpoint(endpoint, options);
    return new HttpTransportBuilder(
      this._application,
      this._transportManager,
      this._defaultTimeoutMs,
      this._errorMappingOptions,
      this._autoStart,
      router,
      this._serializers,
      this._responseTransformer,
    );
  }

  public withBinding(
    planId: string,
    definitionsOrPlan:
      | readonly import('@coreforge/contracts').HttpBindingDefinition[]
      | import('../binding/HttpBindingPlan').HttpBindingPlan,
  ): HttpTransportBuilder {
    const router = this._router ?? new HttpRouter();
    router.registerBinding(planId, definitionsOrPlan);
    return new HttpTransportBuilder(
      this._application,
      this._transportManager,
      this._defaultTimeoutMs,
      this._errorMappingOptions,
      this._autoStart,
      router,
      this._serializers,
      this._responseTransformer,
    );
  }

  public withBindingPlan(
    planId: string,
    definitionsOrPlan:
      | readonly import('@coreforge/contracts').HttpBindingDefinition[]
      | import('../binding/HttpBindingPlan').HttpBindingPlan,
  ): HttpTransportBuilder {
    return this.withBinding(planId, definitionsOrPlan);
  }

  public withSerializer(
    serializer: HttpSerializer,
    options?: HttpSerializerOptions,
  ): HttpTransportBuilder {
    const nextSerializers = [...this._serializers, { serializer, options }];
    return new HttpTransportBuilder(
      this._application,
      this._transportManager,
      this._defaultTimeoutMs,
      this._errorMappingOptions,
      this._autoStart,
      this._router,
      nextSerializers,
      this._responseTransformer,
    );
  }

  public withResponseTransformer(transformer: HttpResponseTransformer): HttpTransportBuilder {
    return new HttpTransportBuilder(
      this._application,
      this._transportManager,
      this._defaultTimeoutMs,
      this._errorMappingOptions,
      this._autoStart,
      this._router,
      this._serializers,
      transformer,
    );
  }

  public build(): HttpTransportManager {
    let serializationEngine: HttpSerializationEngine | undefined;

    if (this._serializers.length > 0 || this._responseTransformer) {
      const registry = new HttpSerializerRegistry();

      // Register user-provided serializers
      for (const item of this._serializers) {
        registry.register(item.serializer, item.options);
      }

      // Default JSON serializer fallback if no serializer for application/json was registered
      const resolverTest = new HttpSerializerResolver(registry);
      if (!resolverTest.resolve('application/json')) {
        registry.register(new HttpJsonSerializer());
      }

      // Lock the registry during build
      registry.lock();

      const resolver = new HttpSerializerResolver(registry);
      serializationEngine = new HttpSerializationEngine(
        resolver,
        undefined,
        this._responseTransformer,
      );
    }

    return new HttpTransportManager({
      application: this._application,
      transportManager: this._transportManager,
      defaultTimeoutMs: this._defaultTimeoutMs,
      errorMappingOptions: this._errorMappingOptions,
      autoStart: this._autoStart,
      router: this._router,
      serializationEngine,
    });
  }
}
