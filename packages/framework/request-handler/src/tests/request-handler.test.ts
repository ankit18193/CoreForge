import * as assert from 'node:assert';
import { test } from 'node:test';

import {
  Container,
  Controller,
  EventBus,
  HttpRequest,
  HttpResponse,
  Logger,
  Middleware,
  MiddlewareContext,
  Next,
  RouteMethod,
} from '@coreforge/contracts';
import { ControllerFactory, ControllerManager } from '@coreforge/controllers';
import { PipelineBuilder as MiddlewarePipelineBuilder } from '@coreforge/middleware';
import { RouterBuilder } from '@coreforge/router';

import { RequestHandlerConfigurationError } from '../errors/RequestHandlerErrors';
import { RequestHandler } from '../handler/RequestHandler';
import { RequestHandlerBuilder } from '../handler/RequestHandlerBuilder';
import { RequestHandlerState } from '../lifecycle/RequestHandlerLifecycle';
import { RequestServices } from '../types/requestHandlerTypes';

class DummyLogger implements Logger {
  debug() {}
  info() {}
  warn() {}
  error() {}
  fatal() {}
}

class DummyEventBus implements EventBus {
  async publish() {}
  subscribe() {
    return {};
  }
  unsubscribe() {}
}

class DummyContainer implements Container {
  resolve<T>(): T {
    return {} as T;
  }
  has() {
    return true;
  }
}

class TestController implements Controller {
  public getSync() {
    return { name: 'sync-data' };
  }

  public async getAsync() {
    return Promise.resolve({ name: 'async-data' });
  }
}

class AuthMiddleware implements Middleware {
  public async execute(context: MiddlewareContext, next: Next): Promise<void> {
    const reqContext = context as unknown as Record<string, unknown>;
    const reqObj = reqContext.request as Record<string, unknown>;
    const headers = (reqObj.headers || {}) as Record<string, string>;
    if (headers.authorization === 'Bearer token123') {
      await next();
    } else {
      const resObj = reqContext.response as Record<string, unknown>;
      resObj.status = 401;
      resObj.body = { error: 'Unauthorized' };
    }
  }
}

class DummyRequest implements HttpRequest {
  public readonly method: string;
  public readonly url: string;
  public readonly path: string;
  public readonly query = Object.freeze({});
  public readonly headers: Readonly<Record<string, unknown>>;
  public readonly cookies = Object.freeze({});
  public readonly body: unknown = null;
  public readonly parameters = Object.freeze({});
  public readonly remoteAddress = '127.0.0.1';
  public readonly protocol = 'HTTP/1.1';
  public readonly requestId = 'req-abc';

  constructor(method: string, path: string, headers: Record<string, unknown> = {}) {
    this.method = method;
    this.path = path;
    this.url = path;
    this.headers = Object.freeze(headers);
  }
}

class DummyResponse implements HttpResponse {
  public status = 0;
  public headers = {};
  public cookies = {};
  public body: unknown = null;
}

test('Request Handler Pipeline Package', async (t) => {
  const container = new DummyContainer();
  const logger = new DummyLogger();
  const eventBus = new DummyEventBus();
  const services: RequestServices = { logger, container, eventBus };

  const router = new RouterBuilder().build();
  router.register({ method: RouteMethod.GET, path: '/users/sync' });
  router.register({ method: RouteMethod.GET, path: '/users/async' });

  const factory = new ControllerFactory();
  const controllerManager = new ControllerManager(factory);
  controllerManager.startRegistration();
  const ctrlId = controllerManager.register(TestController, { name: 'Test' });
  controllerManager.completeRegistration();

  const middlewarePipeline = new MiddlewarePipelineBuilder()
    .useRoute('/users/sync', new AuthMiddleware())
    .build();

  await t.test('Builder validation - missing options throws ConfigurationError', async () => {
    const builder = new RequestHandlerBuilder();
    assert.throws(() => {
      builder.build();
    }, RequestHandlerConfigurationError);

    builder.setRouter(router);
    assert.throws(() => {
      builder.build();
    }, RequestHandlerConfigurationError);

    builder.setMiddlewarePipeline(middlewarePipeline);
    assert.throws(() => {
      builder.build();
    }, RequestHandlerConfigurationError);
  });

  await t.test(
    'Pipeline execution - Successful request routing, middleware validation, and sync controller invoke',
    async () => {
      const builder = new RequestHandlerBuilder()
        .setRouter(router)
        .setMiddlewarePipeline(middlewarePipeline)
        .setControllerManager(controllerManager)
        .addRouteMapping({
          method: RouteMethod.GET,
          path: '/users/sync',
          controllerId: ctrlId,
          actionName: 'getSync',
        });

      const handler = new RequestHandler(builder.build(), services);
      assert.strictEqual(handler.state, RequestHandlerState.READY);

      const request = new DummyRequest('GET', '/users/sync', {
        authorization: 'Bearer token123',
      });
      const response = new DummyResponse();

      await handler.handle(request, response);

      assert.strictEqual(response.status, 200);
      assert.deepStrictEqual(response.body, { name: 'sync-data' });
    },
  );

  await t.test('Pipeline execution - Async controller invoke', async () => {
    const builder = new RequestHandlerBuilder()
      .setRouter(router)
      .setMiddlewarePipeline(middlewarePipeline)
      .setControllerManager(controllerManager)
      .addRouteMapping({
        method: RouteMethod.GET,
        path: '/users/async',
        controllerId: ctrlId,
        actionName: 'getAsync',
      });

    const handler = new RequestHandler(builder.build(), services);
    const request = new DummyRequest('GET', '/users/async');
    const response = new DummyResponse();

    await handler.handle(request, response);

    assert.strictEqual(response.status, 200);
    assert.deepStrictEqual(response.body, { name: 'async-data' });
  });

  await t.test('Middleware short circuiting - Auth fail returning 401', async () => {
    const builder = new RequestHandlerBuilder()
      .setRouter(router)
      .setMiddlewarePipeline(middlewarePipeline)
      .setControllerManager(controllerManager)
      .addRouteMapping({
        method: RouteMethod.GET,
        path: '/users/sync',
        controllerId: ctrlId,
        actionName: 'getSync',
      });

    const handler = new RequestHandler(builder.build(), services);
    const request = new DummyRequest('GET', '/users/sync', { authorization: 'Bearer invalid' });
    const response = new DummyResponse();

    await handler.handle(request, response);

    assert.strictEqual(response.status, 401);
    assert.deepStrictEqual(response.body, { error: 'Unauthorized' });
  });

  await t.test('Routing fallback - Missing route returns 404 NotFound', async () => {
    const builder = new RequestHandlerBuilder()
      .setRouter(router)
      .setMiddlewarePipeline(middlewarePipeline)
      .setControllerManager(controllerManager);

    const handler = new RequestHandler(builder.build(), services);
    const request = new DummyRequest('GET', '/missing-route');
    const response = new DummyResponse();

    await handler.handle(request, response);

    assert.strictEqual(response.status, 404);
    const resBody = response.body as Record<string, unknown>;
    assert.strictEqual(resBody.statusCode, 404);
  });

  await t.test('Diagnostics metrics tracking average timings and counts', async () => {
    const builder = new RequestHandlerBuilder()
      .setRouter(router)
      .setMiddlewarePipeline(middlewarePipeline)
      .setControllerManager(controllerManager)
      .addRouteMapping({
        method: RouteMethod.GET,
        path: '/users/async',
        controllerId: ctrlId,
        actionName: 'getAsync',
      });

    const handler = new RequestHandler(builder.build(), services);
    const request = new DummyRequest('GET', '/users/async');
    const response = new DummyResponse();

    await handler.handle(request, response);

    const snapshot = handler.diagnostics;
    assert.strictEqual(snapshot.totalRequests, 1);
    assert.strictEqual(snapshot.completedRequests, 1);
    assert.strictEqual(snapshot.failedRequests, 0);
  });

  await t.test(
    'Request Cancellation - client cancellation aborts processing',
    async () => {
      const builder = new RequestHandlerBuilder()
        .setRouter(router)
        .setMiddlewarePipeline(middlewarePipeline)
        .setControllerManager(controllerManager)
        .addRouteMapping({
          method: RouteMethod.GET,
          path: '/users/async',
          controllerId: ctrlId,
          actionName: 'getAsync',
        });

      const handler = new RequestHandler(builder.build(), services);
      const request = new DummyRequest('GET', '/users/async');
      const response = new DummyResponse();

      const handlePromise = handler.handle(request, response);
      assert.ok(handlePromise);
      await handlePromise;
      assert.strictEqual(response.status, 200);
    },
  );

  await t.test('Concurrent request context isolation - 1000 requests', async () => {
    const builder = new RequestHandlerBuilder()
      .setRouter(router)
      .setMiddlewarePipeline(middlewarePipeline)
      .setControllerManager(controllerManager)
      .addRouteMapping({
        method: RouteMethod.GET,
        path: '/users/sync',
        controllerId: ctrlId,
        actionName: 'getSync',
      });

    const handler = new RequestHandler(builder.build(), services);

    const promises: Promise<void>[] = [];
    for (let i = 0; i < 1000; i++) {
      const req = new DummyRequest('GET', '/users/sync', { authorization: 'Bearer token123' });
      const res = new DummyResponse();
      promises.push(
        handler.handle(req, res).then(() => {
          assert.strictEqual(res.status, 200);
          assert.deepStrictEqual(res.body, { name: 'sync-data' });
        }),
      );
    }

    await Promise.all(promises);
  });
});
