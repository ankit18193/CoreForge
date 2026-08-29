import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { test } from 'node:test';

import {
  HttpAdapter,
  HttpDiagnosticsSnapshot,
  HttpHeaders,
  HttpMethod,
  HttpPathParameters,
  HttpQuery,
  HttpRequest,
  HttpRequestOptions,
  HttpResponse,
  HttpResponseOptions,
} from '@coreforge/contracts';
import { CoreForgeError } from '@coreforge/errors';
import { TransportError, TransportResponseFactory } from '@coreforge/transport';

import {
  HTTP_STATUS_CODES,
  HttpCancellationError,
  HttpConfigurationError,
  HttpError,
  HttpExecutionError,
  HttpMappingError,
  HttpRequestError,
  HttpResponseError,
  HttpStateError,
  HttpTimeoutError,
  HttpValidationError,
} from '../src/index';

test('CoreForge HTTP Transport Adapter & Request Execution Engine (@coreforge/http) - Stage 1', async (t) => {
  // =========================================================================
  // 1. CONTRACTS & TYPES (Stage 1)
  // =========================================================================
  await t.test('1. Type & Contract exports are valid', () => {
    const method: HttpMethod = 'GET';
    assert.strictEqual(method, 'GET');

    const headers: HttpHeaders = {
      'content-type': 'application/json',
      accept: ['application/json', 'text/plain'],
    };
    assert.strictEqual(headers['content-type'], 'application/json');

    const query: HttpQuery = { search: 'coreforge', page: '1' };
    assert.strictEqual(query.search, 'coreforge');

    const params: HttpPathParameters = { id: 'order-123' };
    assert.strictEqual(params.id, 'order-123');

    const req: HttpRequest<{ title: string }> = {
      method: 'POST',
      url: 'https://api.coreforge.dev/orders?page=1',
      path: '/orders',
      headers,
      query,
      pathParameters: params,
      body: { title: 'New Order' },
      cookies: { session: 'sess-abc' },
      metadata: { ip: '127.0.0.1' },
    };
    assert.strictEqual(req.method, 'POST');
    assert.strictEqual(req.body?.title, 'New Order');

    const res: HttpResponse<{ created: boolean }> = {
      status: 201,
      headers: { 'content-type': 'application/json' },
      body: { created: true },
      cookies: { logged_in: 'true' },
      metadata: { duration: 10 },
    };
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body?.created, true);

    const reqOpts: HttpRequestOptions = {
      timeoutMs: 5000,
      metadata: { source: 'gateway' },
    };
    assert.strictEqual(reqOpts.timeoutMs, 5000);

    const resOpts: HttpResponseOptions = {
      defaultStatus: 200,
      includeErrorDetails: false,
      cancellationStatus: 499,
    };
    assert.strictEqual(resOpts.cancellationStatus, 499);

    const adapter: HttpAdapter<{ msg: string }, { reply: string }> = {
      id: 'http',
      name: 'HTTP Adapter',
      priority: 100,
      capabilities: ['REQUEST', 'RESPONSE', 'CANCELLATION', 'METADATA'],
      defaultOptions: reqOpts,
      async handle(request, _context) {
        const httpReq = request.payload;
        const httpRes: HttpResponse<{ reply: string }> = {
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: { reply: `echo: ${httpReq.body?.msg}` },
        };
        return TransportResponseFactory.createSuccess(httpRes);
      },
    };
    assert.strictEqual(adapter.id, 'http');
    assert.strictEqual(adapter.priority, 100);

    const diag: HttpDiagnosticsSnapshot = {
      totalRequests: 10,
      successfulRequests: 8,
      failedRequests: 1,
      cancelledRequests: 1,
      activeRequests: 0,
      validationFailures: 0,
      mappingFailures: 0,
      responseMappings: 10,
      averageDurationMs: 5.2,
      slowestDurationMs: 12.1,
    };
    assert.strictEqual(diag.totalRequests, 10);
    assert.strictEqual(HTTP_STATUS_CODES.OK, 200);
    assert.strictEqual(HTTP_STATUS_CODES.CLIENT_CLOSED_REQUEST, 499);
  });

  // =========================================================================
  // 2. ERROR HIERARCHY (Stage 1)
  // =========================================================================
  await t.test(
    '2. Error hierarchy inherits from CoreForgeError, TransportError, and HttpError with correct codes',
    () => {
      const baseErr = new HttpError('Base HTTP error');
      assert.ok(baseErr instanceof CoreForgeError);
      assert.ok(baseErr instanceof TransportError);
      assert.ok(baseErr instanceof HttpError);
      assert.strictEqual(baseErr.code, 'CF-HTTP');
      assert.strictEqual(baseErr.message, 'Base HTTP error');

      const configErr = new HttpConfigurationError('Invalid HTTP config');
      assert.ok(configErr instanceof HttpError);
      assert.strictEqual(configErr.code, 'CF-HTTP-CONFIGURATION');

      const valErr = new HttpValidationError('Invalid HTTP request');
      assert.ok(valErr instanceof HttpError);
      assert.strictEqual(valErr.code, 'CF-HTTP-VALIDATION');

      const reqErr = new HttpRequestError('Malformed HTTP request');
      assert.ok(reqErr instanceof HttpError);
      assert.strictEqual(reqErr.code, 'CF-HTTP-REQUEST');

      const resErr = new HttpResponseError('HTTP response error');
      assert.ok(resErr instanceof HttpError);
      assert.strictEqual(resErr.code, 'CF-HTTP-RESPONSE');

      const mapErr = new HttpMappingError('Mapping failed');
      assert.ok(mapErr instanceof HttpError);
      assert.strictEqual(mapErr.code, 'CF-HTTP-MAPPING');

      const stateErr = new HttpStateError('HTTP not ready');
      assert.ok(stateErr instanceof HttpError);
      assert.strictEqual(stateErr.code, 'CF-HTTP-STATE');

      const execErr = new HttpExecutionError('HTTP execution failed');
      assert.ok(execErr instanceof HttpError);
      assert.strictEqual(execErr.code, 'CF-HTTP-EXECUTION');

      const cancelErr = new HttpCancellationError('HTTP request cancelled');
      assert.ok(cancelErr instanceof HttpError);
      assert.strictEqual(cancelErr.code, 'CF-HTTP-CANCELLATION');

      const timeoutErr = new HttpTimeoutError('HTTP request timed out');
      assert.ok(timeoutErr instanceof HttpError);
      assert.strictEqual(timeoutErr.code, 'CF-HTTP-TIMEOUT');
    },
  );

  // =========================================================================
  // 3. ARCHITECTURAL BOUNDARY (Stage 1)
  // =========================================================================
  await t.test('3. Architectural boundary: Zero forbidden dependencies in @coreforge/http', () => {
    const pkgJsonPath = path.resolve(__dirname, '../../package.json');
    const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));

    const deps = Object.keys(pkgJson.dependencies || {});
    const forbidden = [
      'express',
      'fastify',
      'koa',
      'hapi',
      'ws',
      'socket.io',
      'redis',
      'rabbitmq',
      'kafka',
      'amqplib',
      'kafkajs',
      'ioredis',
      '@coreforge/kernel',
      '@coreforge/application',
      '@coreforge/dispatch',
      '@coreforge/query',
      '@coreforge/events',
    ];

    for (const f of forbidden) {
      assert.strictEqual(
        deps.includes(f),
        false,
        `Forbidden dependency detected in @coreforge/http: ${f}`,
      );
    }
  });
});
