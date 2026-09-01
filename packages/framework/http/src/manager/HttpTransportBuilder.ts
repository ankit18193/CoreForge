import {
  HttpErrorMapper,
  HttpErrorMapperRegistrationOptions,
  HttpResponseTransformer,
  HttpSerializer,
  HttpSerializerOptions,
  TransportManager,
} from '@coreforge/contracts';
import { ApplicationIntegration } from '@coreforge/integration';

import { HttpTransportManager } from './HttpTransportManager';
import { HttpErrorMapperRegistry } from '../response/error/HttpErrorMapperRegistry';
import { HttpErrorMappingEngine } from '../response/error/HttpErrorMappingEngine';
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

export interface ErrorMapperRegistrationItem {
  readonly mapper: HttpErrorMapper;
  readonly options?: HttpErrorMapperRegistrationOptions | undefined;
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
  private readonly _errorMappers: readonly ErrorMapperRegistrationItem[];

  private constructor(
    application?: ApplicationIntegration,
    transportManager?: TransportManager,
    defaultTimeoutMs?: number,
    errorMappingOptions?: HttpErrorMappingOptions,
    autoStart?: boolean,
    router?: HttpRouter,
    serializers: readonly SerializerRegistrationItem[] = [],
    responseTransformer?: HttpResponseTransformer,
    errorMappers: readonly ErrorMapperRegistrationItem[] = [],
  ) {
    this._application = application;
    this._transportManager = transportManager;
    this._defaultTimeoutMs = defaultTimeoutMs;
    this._errorMappingOptions = errorMappingOptions;
    this._autoStart = autoStart;
    this._router = router;
    this._serializers = serializers;
    this._responseTransformer = responseTransformer;
    this._errorMappers = errorMappers;
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
      this._errorMappers,
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
      this._errorMappers,
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
      this._errorMappers,
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
      this._errorMappers,
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
      this._errorMappers,
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
      this._errorMappers,
    );
  }

  public withRoute(route: import('@coreforge/contracts').HttpRoute): HttpTransportBuilder {
    const router = this._router ?? new HttpRouter();
    router.route(route);
    return new HttpTransportBuilder(
      this._application,
      this._transportManager,
      this._defaultTimeoutMs,
      this._errorMappingOptions,
      this._autoStart,
      router,
      this._serializers,
      this._responseTransformer,
      this._errorMappers,
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
      this._errorMappers,
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
      this._errorMappers,
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
      this._errorMappers,
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
      this._errorMappers,
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
      this._errorMappers,
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
      this._errorMappers,
    );
  }

  public withErrorMapper(
    mapper: HttpErrorMapper,
    options?: HttpErrorMapperRegistrationOptions,
  ): HttpTransportBuilder {
    const nextErrorMappers = [...this._errorMappers, { mapper, options }];
    return new HttpTransportBuilder(
      this._application,
      this._transportManager,
      this._defaultTimeoutMs,
      this._errorMappingOptions,
      this._autoStart,
      this._router,
      this._serializers,
      this._responseTransformer,
      nextErrorMappers,
    );
  }

  public build(): HttpTransportManager {
    let serializationEngine: HttpSerializationEngine | undefined;

    if (this._serializers.length > 0 || this._responseTransformer) {
      const registry = new HttpSerializerRegistry();

      for (const item of this._serializers) {
        registry.register(item.serializer, item.options);
      }

      const resolverTest = new HttpSerializerResolver(registry);
      if (!resolverTest.resolve('application/json')) {
        registry.register(new HttpJsonSerializer());
      }

      registry.lock();

      const resolver = new HttpSerializerResolver(registry);
      serializationEngine = new HttpSerializationEngine(
        resolver,
        undefined,
        this._responseTransformer,
      );
    }

    let errorMappingEngine: HttpErrorMappingEngine | undefined;
    if (this._errorMappers.length > 0) {
      const errorRegistry = new HttpErrorMapperRegistry();
      for (const item of this._errorMappers) {
        errorRegistry.register(item.mapper, item.options);
      }
      errorRegistry.lock();
      errorMappingEngine = new HttpErrorMappingEngine(
        errorRegistry,
        this._errorMappingOptions ?? {},
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
      errorMappingEngine,
    });
  }
}
