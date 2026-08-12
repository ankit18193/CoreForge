import { Container, ServiceToken } from '@coreforge/container';
import {
  FrameworkRegistry,
  HttpAdapter,
  HttpRequest,
  HttpResponse,
  HttpServer as IHttpServer,
} from '@coreforge/contracts';

import { HttpServerConfiguration } from './HttpServerConfiguration';
import { HttpServerState } from './HttpServerState';
import { HttpDiagnostics } from '../diagnostics/HttpDiagnostics';
import { HttpDiagnosticsSnapshot } from '../diagnostics/HttpDiagnosticsSnapshot';
import { HttpInitializationError } from '../errors/HttpErrors';
import { HttpExecutionContext } from '../execution/HttpExecutionContext';
import { RequestIdGenerator } from '../internal/RequestIdGenerator';
import { ConnectionDescriptor } from '../lifecycle/ConnectionDescriptor';
import { ConnectionManager } from '../lifecycle/ConnectionManager';
import { ServerLifecycleManager } from '../lifecycle/ServerLifecycleManager';
import { HttpPipeline } from '../pipeline/HttpPipeline';
import { HttpStage } from '../pipeline/HttpStage';
import { AdapterRegistry } from '../registry/AdapterRegistry';
import { RequestContext } from '../request/RequestContext';
import { ResponseBuilder } from '../response/ResponseBuilder';

export type HttpHandler = (
  req: HttpRequest,
  res: ResponseBuilder,
) => Promise<HttpResponse> | HttpResponse;

export class HttpServer implements IHttpServer {
  private readonly _configuration: HttpServerConfiguration;
  private readonly _container: Container;
  private readonly _registry = new AdapterRegistry();
  private readonly _lifecycleManager = new ServerLifecycleManager();
  private readonly _connectionManager = new ConnectionManager();
  private readonly _pipeline = new HttpPipeline();
  private readonly _diagnostics = new HttpDiagnostics();
  private readonly _idGenerator = new RequestIdGenerator();

  private _handler?: HttpHandler | undefined;

  constructor(configuration: HttpServerConfiguration, container: Container) {
    this._configuration = configuration;
    this._container = container;

    this.registerDefaultStages();
  }

  public get registry(): AdapterRegistry {
    return this._registry;
  }

  public get pipeline(): HttpPipeline {
    return this._pipeline;
  }

  public get state(): HttpServerState {
    return this._lifecycleManager.state;
  }

  public setHandler(handler: HttpHandler): void {
    this._handler = handler;
  }

  public async start(): Promise<void> {
    if (
      this._lifecycleManager.state === HttpServerState.RUNNING ||
      this._lifecycleManager.state === HttpServerState.STARTING
    ) {
      throw new HttpInitializationError('HTTP Server is already starting or running.');
    }

    this._lifecycleManager.transitionTo(HttpServerState.STARTING);
    try {
      const token = this._configuration.adapterToken;
      if (!token) {
        throw new HttpInitializationError('No adapter token registered in configuration.');
      }

      const adapter = this._container.resolve<HttpAdapter>(token as ServiceToken<HttpAdapter>);
      this._registry.register({
        name: adapter.name,
        version: '0.1.0',
        adapter,
        capabilities: {
          http1: true,
          http2: false,
          https: false,
          websocket: false,
          streaming: false,
          multipart: false,
        },
      });

      adapter.setHandler(async (request: HttpRequest) => {
        return this.handleRequest(request);
      });

      await adapter.start();

      this._diagnostics.setStartupTimestamp(Date.now());
      this._lifecycleManager.transitionTo(HttpServerState.RUNNING);
    } catch (err: unknown) {
      this._lifecycleManager.transitionTo(HttpServerState.FAILED);
      throw err instanceof Error ? err : new HttpInitializationError(String(err));
    }
  }

  public async stop(): Promise<void> {
    if (
      this._lifecycleManager.state === HttpServerState.STOPPED ||
      this._lifecycleManager.state === HttpServerState.STOPPING
    ) {
      return;
    }

    this._lifecycleManager.transitionTo(HttpServerState.STOPPING);
    try {
      const descriptor = this._registry.getActive();
      await this._connectionManager.gracefulClose(5000);
      await descriptor.adapter.stop();
      this._lifecycleManager.transitionTo(HttpServerState.STOPPED);
    } catch (err: unknown) {
      this._lifecycleManager.transitionTo(HttpServerState.FAILED);
      throw err instanceof Error ? err : new HttpInitializationError(String(err));
    }
  }

  public async restart(): Promise<void> {
    await this.stop();
    await this.start();
  }

  public get diagnostics(): HttpDiagnosticsSnapshot {
    return this._diagnostics.getSnapshot();
  }

  private async handleRequest(request: HttpRequest): Promise<HttpResponse> {
    const executionContext = new HttpExecutionContext();

    const connectionId = `conn-${Date.now()}-${Math.random()}`;
    const descriptor: ConnectionDescriptor = {
      connectionId,
      openedAt: Date.now(),
      remoteAddress: request.remoteAddress || '127.0.0.1',
      protocol: request.protocol || 'HTTP/1.1',
      activeRequests: 1,
      state: 'OPEN',
    };

    // Store connection context parameters temporarily in execution metadata
    (executionContext as unknown as Record<string, unknown>)._connectionId = connectionId;
    (executionContext as unknown as Record<string, unknown>)._connectionDescriptor = descriptor;
    (executionContext as unknown as Record<string, unknown>)._request = request;

    await this._pipeline.execute(executionContext);

    if (executionContext.requestContext && executionContext.requestContext.response) {
      return executionContext.requestContext.response;
    }

    return new ResponseBuilder().status(500).body('Internal Server Error').build();
  }

  private registerDefaultStages(): void {
    const pipe = this._pipeline;

    // Stage 1: INCOMING_CONNECTION
    const incStage = pipe.getDescriptor(HttpStage.INCOMING_CONNECTION);
    if (incStage) {
      Object.assign(incStage, {
        hook: {
          execute: (context: HttpExecutionContext) => {
            const descriptor = (context as unknown as Record<string, unknown>)
              ._connectionDescriptor as ConnectionDescriptor;
            this._connectionManager.connectionOpened(descriptor);
            this._connectionManager.requestReceived();
            this._diagnostics.connectionOpened();
            this._diagnostics.requestReceived();
          },
        },
      });
    }

    // Stage 2: CREATE_REQUEST
    const reqStage = pipe.getDescriptor(HttpStage.CREATE_REQUEST);
    if (reqStage) {
      Object.assign(reqStage, {
        hook: {
          execute: (context: HttpExecutionContext) => {
            const rawReq = (context as unknown as Record<string, unknown>)._request as HttpRequest;
            context.requestContext = undefined; // Init requestContext slot
            (context as unknown as Record<string, unknown>)._finalRequest = rawReq;
          },
        },
      });
    }

    // Stage 3: CREATE_RESPONSE
    const resStage = pipe.getDescriptor(HttpStage.CREATE_RESPONSE);
    if (resStage) {
      Object.assign(resStage, {
        hook: {
          execute: (context: HttpExecutionContext) => {
            context.responseBuilder = new ResponseBuilder();
          },
        },
      });
    }

    // Stage 4: BUILD_CONTEXT
    const buildStage = pipe.getDescriptor(HttpStage.BUILD_CONTEXT);
    if (buildStage) {
      Object.assign(buildStage, {
        hook: {
          execute: (context: HttpExecutionContext) => {
            const req = (context as unknown as Record<string, unknown>)
              ._finalRequest as HttpRequest;
            const registryMock: FrameworkRegistry = {
              get: <T>(name: string) => this._container.resolve<T>(name),
              has: (name: string) => this._container.has(name),
            };

            context.requestContext = new RequestContext({
              request: req,
              requestId: req.requestId || this._idGenerator.generate(),
              registry: registryMock,
            });
          },
        },
      });
    }

    // Stage 5: DELEGATE_FRAMEWORK
    const delStage = pipe.getDescriptor(HttpStage.DELEGATE_FRAMEWORK);
    if (delStage) {
      Object.assign(delStage, {
        hook: {
          execute: async (context: HttpExecutionContext) => {
            if (this._handler && context.requestContext && context.responseBuilder) {
              const res = await this._handler(
                context.requestContext.request,
                context.responseBuilder,
              );
              context.requestContext = context.requestContext.withResponse(res);
            } else if (context.responseBuilder && context.requestContext) {
              const res = context.responseBuilder.status(200).body('OK').build();
              context.requestContext = context.requestContext.withResponse(res);
            }
          },
        },
      });
    }

    // Stage 6: SEND_RESPONSE
    const sendStage = pipe.getDescriptor(HttpStage.SEND_RESPONSE);
    if (sendStage) {
      Object.assign(sendStage, {
        hook: {
          execute: (context: HttpExecutionContext) => {
            if (!context.requestContext?.response) {
              if (context.responseBuilder && context.requestContext) {
                const res = context.responseBuilder.status(404).body('Not Found').build();
                context.requestContext = context.requestContext.withResponse(res);
              }
            }
          },
        },
      });
    }

    // Stage 7: CLOSE_REQUEST
    const closeStage = pipe.getDescriptor(HttpStage.CLOSE_REQUEST);
    if (closeStage) {
      Object.assign(closeStage, {
        hook: {
          execute: (context: HttpExecutionContext) => {
            const connectionId = (context as unknown as Record<string, unknown>)
              ._connectionId as string;
            this._connectionManager.updateActiveRequests(connectionId, -1);
            this._connectionManager.connectionClosed(connectionId);
            this._diagnostics.connectionClosed();

            context.complete();
            if (context.duration !== undefined) {
              this._diagnostics.requestCompleted(context.duration);
            }
          },
        },
      });
    }
  }
}
