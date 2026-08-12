import * as assert from 'node:assert';
import { test } from 'node:test';

import { Container } from '@coreforge/container';
import { HttpAdapter, HttpRequest, HttpResponse } from '@coreforge/contracts';

import { DuplicateAdapterError, HttpInitializationError } from '../errors/HttpErrors';
import { HttpStage } from '../pipeline/HttpStage';
import { HttpRequest as ConcreteRequest } from '../request/HttpRequest';
import { ResponseBuilder } from '../response/ResponseBuilder';
import { HttpServerBuilder } from '../server/HttpServerBuilder';
import { HttpServerState } from '../server/HttpServerState';

class MockAdapter implements HttpAdapter {
  public readonly name = 'MockAdapter';
  private _handler?: ((request: HttpRequest) => Promise<HttpResponse>) | undefined;
  private _started = false;

  public setHandler(handler: (request: HttpRequest) => Promise<HttpResponse>): void {
    this._handler = handler;
  }

  public async start(): Promise<void> {
    this._started = true;
  }

  public async stop(): Promise<void> {
    this._started = false;
  }

  public get isStarted(): boolean {
    return this._started;
  }

  public async triggerRequest(request: HttpRequest): Promise<HttpResponse> {
    if (!this._handler) {
      throw new Error('No handler registered');
    }
    return this._handler(request);
  }
}

test('HTTP Server Framework Abstraction', async (t) => {
  await t.test('HttpServerBuilder - Assembles valid Configuration and Server via DI', async () => {
    const container = new Container();
    container.registerValue('adapter-token', new MockAdapter());

    const server = new HttpServerBuilder(container)
      .useAdapter('adapter-token')
      .configureHost('127.0.0.1')
      .configurePort(9000)
      .configureRequestLimit('10mb')
      .build();

    assert.strictEqual(server.state, HttpServerState.CREATED);
  });

  await t.test(
    'Lifecycle transitions - Start, Stop, and Restart transitions adhere to validation rules',
    async () => {
      const container = new Container();
      const mock = new MockAdapter();
      container.registerValue('adapter-token', mock);

      const server = new HttpServerBuilder(container).useAdapter('adapter-token').build();

      assert.strictEqual(server.state, HttpServerState.CREATED);

      await server.start();
      assert.strictEqual(server.state, HttpServerState.RUNNING);
      assert.strictEqual(mock.isStarted, true);

      await server.stop();
      assert.strictEqual(server.state, HttpServerState.STOPPED);
      assert.strictEqual(mock.isStarted, false);

      await server.stop();
      assert.strictEqual(server.state, HttpServerState.STOPPED);
    },
  );

  await t.test(
    'Double Start validation - Double start attempts throw HttpInitializationError',
    async () => {
      const container = new Container();
      container.registerValue('adapter-token', new MockAdapter());

      const server = new HttpServerBuilder(container).useAdapter('adapter-token').build();

      await server.start();
      await assert.rejects(async () => {
        await server.start();
      }, HttpInitializationError);

      await server.stop();
    },
  );

  await t.test(
    'Request & Response Immutability - Headers, query parameters, cookies, and responses are deeply frozen',
    async () => {
      const request = new ConcreteRequest({
        method: 'GET',
        url: '/test?foo=bar',
        path: '/test',
        query: { foo: 'bar' },
        headers: { host: 'localhost' },
        cookies: { session: '123' },
        parameters: { id: 'abc' },
        remoteAddress: '127.0.0.1',
        protocol: 'HTTPS',
        requestId: 'req-1',
      });

      assert.throws(() => {
        (request.headers as unknown as Record<string, string>).host = 'mutated';
      });
      assert.throws(() => {
        (request.query as unknown as Record<string, string>).foo = 'mutated';
      });

      const response = new ResponseBuilder()
        .status(200)
        .header('x-custom', 'val')
        .cookie({ name: 'test-cookie', value: 'cookie-val', secure: true, httpOnly: true })
        .body({ ok: true })
        .build();

      assert.throws(() => {
        (response.headers as unknown as Record<string, string>)['x-custom'] = 'mutated';
      });
      assert.throws(() => {
        (response.cookies as unknown as Record<string, unknown>)['test-cookie'] = 'mutated';
      });
    },
  );

  await t.test(
    'Pipeline & Stages - Stage order execution and dynamic hook extensions',
    async () => {
      const container = new Container();
      const mock = new MockAdapter();
      container.registerValue('adapter-token', mock);

      const server = new HttpServerBuilder(container).useAdapter('adapter-token').build();

      let customStageFired = false;
      server.pipeline.registerStage({
        name: 'CUSTOM_STAGE',
        hook: {
          execute() {
            customStageFired = true;
          },
        },
        order: 35,
        enabled: true,
      });

      await server.start();

      const req = new ConcreteRequest({
        method: 'GET',
        url: '/run',
        path: '/run',
        remoteAddress: '127.0.0.1',
        protocol: 'HTTP',
        requestId: 'req-abc',
      });

      await mock.triggerRequest(req);
      assert.strictEqual(customStageFired, true);

      const stages = server.pipeline.getStages();
      assert.ok(stages.includes('CUSTOM_STAGE'));
      assert.strictEqual(
        stages.indexOf('CUSTOM_STAGE'),
        stages.indexOf(HttpStage.CREATE_RESPONSE) + 1,
      );

      await server.stop();
    },
  );

  await t.test(
    'Connection Manager & Diagnostics - Diagnostics tracking active metrics and graceful closing',
    async () => {
      const container = new Container();
      const mock = new MockAdapter();
      container.registerValue('adapter-token', mock);

      const server = new HttpServerBuilder(container).useAdapter('adapter-token').build();

      server.setHandler(async (_req, resBuilder) => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return resBuilder.status(200).body('processed').build();
      });

      await server.start();

      const req = new ConcreteRequest({
        method: 'POST',
        url: '/submit',
        path: '/submit',
        remoteAddress: '127.0.0.1',
        protocol: 'HTTP/1.1',
        requestId: 'req-999',
      });

      const triggerPromise = mock.triggerRequest(req);

      const intermediateSnapshot = server.diagnostics;
      assert.strictEqual(intermediateSnapshot.totalRequests, 1);

      await triggerPromise;

      const finalSnapshot = server.diagnostics;
      assert.strictEqual(finalSnapshot.totalRequests, 1);
      assert.strictEqual(finalSnapshot.activeRequests, 0);
      assert.ok(finalSnapshot.averageLatency >= 50);

      await server.stop();
    },
  );

  await t.test('Adapter Registry - Prevents duplicate adapter registration', async () => {
    const container = new Container();
    const mock = new MockAdapter();
    container.registerValue('adapter-token', mock);

    const server = new HttpServerBuilder(container).useAdapter('adapter-token').build();

    await server.start();

    assert.throws(() => {
      server.registry.register({
        name: 'MockAdapter',
        version: '1.0.0',
        adapter: mock,
        capabilities: {
          http1: true,
          http2: false,
          https: false,
          websocket: false,
          streaming: false,
          multipart: false,
        },
      });
    }, DuplicateAdapterError);

    await server.stop();
  });
});
