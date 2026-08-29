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
import { ExecutionContextManager } from '@coreforge/execution-context';
import {
  TransportCancellationError,
  TransportError,
  TransportResponseFactory,
  TransportTimeoutError,
  TransportValidationError,
} from '@coreforge/transport';

import {
  HTTP_STATUS_CODES,
  HttpCancellationError,
  HttpConfigurationError,
  HttpContextFactory,
  HttpError,
  HttpErrorMapper,
  HttpExecutionError,
  HttpMappingError,
  HttpRequestError,
  HttpRequestMapper,
  HttpRequestSnapshot,
  HttpRequestValidator,
  HttpResponseError,
  HttpResponseFactory,
  HttpResponseMapper,
  HttpStateError,
  HttpTimeoutError,
  HttpValidationError,
} from '../src/index';

test('CoreForge HTTP Transport Adapter & Request Execution Engine (@coreforge/http)', async (t) => {
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
  // 3. REQUEST VALIDATION & SNAPSHOTTING (Stage 2)
  // =========================================================================
  await t.test('3. HttpRequestValidator: Validates structure and rejects invalid inputs', () => {
    assert.throws(
      () => HttpRequestValidator.validate(null),
      (err: Error) => err instanceof HttpValidationError,
    );
    assert.throws(
      () => HttpRequestValidator.validate(undefined),
      (err: Error) => err instanceof HttpValidationError,
    );
    assert.throws(
      () => HttpRequestValidator.validate('GET /api'),
      (err: Error) => err instanceof HttpValidationError,
    );
    assert.throws(
      () => HttpRequestValidator.validate({ method: 'INVALID', url: '/api' }),
      (err: Error) => err instanceof HttpValidationError,
    );
    assert.throws(
      () => HttpRequestValidator.validate({ method: 'GET', url: '' }),
      (err: Error) => err instanceof HttpValidationError,
    );
    assert.throws(
      () => HttpRequestValidator.validate({ method: 'GET', url: '/api', headers: 'bad' }),
      (err: Error) => err instanceof HttpValidationError,
    );
    assert.throws(
      () => HttpRequestValidator.validate({ method: 'GET', url: '/api', query: [1, 2] }),
      (err: Error) => err instanceof HttpValidationError,
    );
    assert.throws(
      () => HttpRequestValidator.validate({ method: 'GET', url: '/api', pathParameters: 123 }),
      (err: Error) => err instanceof HttpValidationError,
    );
    assert.throws(
      () => HttpRequestValidator.validate({ method: 'GET', url: '/api', signal: 'bad' }),
      (err: Error) => err instanceof HttpValidationError,
    );

    const valid = HttpRequestValidator.validate({
      method: 'get',
      url: 'https://example.com/v1/users?active=true',
    });
    assert.strictEqual(valid.method, 'GET');
    assert.strictEqual(valid.path, '/v1/users');
  });

  await t.test(
    '4. HttpRequestSnapshot: Normalizes header names while strictly preserving header value casing',
    () => {
      const rawRequest = {
        method: 'POST',
        url: '/api/v1/auth',
        headers: {
          'Content-Type': 'application/JSON; charset=UTF-8',
          Authorization: 'Bearer SecretToken123ABC',
          'X-Custom-Header': 'MixedCaseValue',
          'X-Array-Header': ['ValueAlpha', 'ValueBeta'],
        },
      };

      const snapshot = HttpRequestSnapshot.create(rawRequest);

      // Header names are deterministically lowercased
      assert.ok('content-type' in snapshot.headers);
      assert.ok('authorization' in snapshot.headers);
      assert.ok('x-custom-header' in snapshot.headers);
      assert.ok('x-array-header' in snapshot.headers);

      // Header values preserve their exact casing
      assert.strictEqual(snapshot.headers['content-type'], 'application/JSON; charset=UTF-8');
      assert.strictEqual(snapshot.headers['authorization'], 'Bearer SecretToken123ABC');
      assert.strictEqual(snapshot.headers['x-custom-header'], 'MixedCaseValue');
      assert.deepStrictEqual(snapshot.headers['x-array-header'], ['ValueAlpha', 'ValueBeta']);
    },
  );

  await t.test('5. HttpRequestSnapshot: Deep cloning and producer mutation isolation', () => {
    const rawBody = { user: { name: 'Alice', roles: ['admin', 'user'] } };
    const rawHeaders = { 'X-Trace-ID': 'tr-101' };
    const rawQuery = { filter: 'active' };

    const snapshot = HttpRequestSnapshot.create<{
      user: { name: string; roles: string[] };
    }>({
      method: 'PUT',
      url: '/users/1?filter=active',
      headers: rawHeaders,
      query: rawQuery,
      body: rawBody,
    });

    // Producer mutates original objects
    rawBody.user.name = 'MutatedBob';
    rawBody.user.roles.push('superadmin');
    rawHeaders['X-Trace-ID'] = 'tr-mutated';
    rawQuery.filter = 'inactive';

    // Snapshot is completely isolated
    assert.strictEqual(snapshot.body?.user.name, 'Alice');
    assert.deepStrictEqual(snapshot.body?.user.roles, ['admin', 'user']);
    assert.strictEqual(snapshot.headers['x-trace-id'], 'tr-101');
    assert.strictEqual(snapshot.query?.filter, 'active');
  });

  await t.test(
    '6. HttpRequestSnapshot: Circular reference detection and deep freeze immutability',
    () => {
      const cyclicBody: { name: string; self?: unknown } = { name: 'cyclic_req' };
      cyclicBody.self = cyclicBody;

      const snapshot = HttpRequestSnapshot.create<{ name: string; self: unknown }>({
        method: 'POST',
        url: '/data',
        body: cyclicBody,
      });

      assert.strictEqual(snapshot.body?.name, 'cyclic_req');
      assert.strictEqual(snapshot.body?.self, '[Circular]');

      // Snapshot is deeply frozen
      assert.throws(() => {
        (snapshot as { method: string }).method = 'DELETE';
      });
      assert.throws(() => {
        (snapshot.body as { name: string }).name = 'mutated';
      });
    },
  );

  await t.test('7. HttpRequestMapper: Maps HttpRequest to generic TransportRequest', () => {
    const httpReq: HttpRequest<{ amount: number }> = {
      method: 'POST',
      url: '/payments?currency=USD',
      path: '/payments',
      headers: { 'Content-Type': 'application/json' },
      query: { currency: 'USD' },
      body: { amount: 500 },
      cookies: { session_id: 'sess-999' },
    };

    const transportReq = HttpRequestMapper.toTransportRequest<{ amount: number }>(httpReq);

    assert.deepStrictEqual(transportReq.payload, { amount: 500 });
    assert.strictEqual(transportReq.metadata.transportType, 'http');
    assert.strictEqual(transportReq.metadata.method, 'POST');
    assert.strictEqual(transportReq.metadata.url, '/payments?currency=USD');
    assert.strictEqual(transportReq.metadata.path, '/payments');
    assert.strictEqual(
      (transportReq.metadata.headers as HttpHeaders)['content-type'],
      'application/json',
    );
    assert.strictEqual(
      (transportReq.metadata.cookies as Record<string, string>).session_id,
      'sess-999',
    );
    assert.ok(Object.isFrozen(transportReq));
  });

  await t.test(
    '8. HttpContextFactory: Bridges HttpRequest to TransportContext and propagates AbortSignal',
    () => {
      const contextManager = new ExecutionContextManager();
      const controller = new AbortController();

      const httpReq: HttpRequest = {
        method: 'GET',
        url: '/stream',
        path: '/stream',
        headers: {},
        signal: controller.signal,
      };

      const transportCtx = HttpContextFactory.create(httpReq, { contextManager });

      assert.strictEqual(transportCtx.transportType, 'http');
      assert.strictEqual(transportCtx.executionContext.state, 'ACTIVE');
      assert.strictEqual(transportCtx.executionContext.signal.aborted, false);

      // Trigger AbortSignal on HttpRequest
      controller.abort();

      assert.strictEqual(transportCtx.executionContext.signal.aborted, true);
    },
  );

  // =========================================================================
  // 4. RESPONSE & ERROR MAPPING (Stage 3)
  // =========================================================================
  await t.test(
    '9. HttpResponseFactory: Creates success and failure responses with status inference',
    () => {
      // 200 with body
      const resWithBody = HttpResponseFactory.createSuccess(undefined, { items: [1, 2, 3] });
      assert.strictEqual(resWithBody.status, 200);
      assert.deepStrictEqual(resWithBody.body, { items: [1, 2, 3] });

      // 204 with no body
      const resNoBody = HttpResponseFactory.createSuccess(undefined, undefined);
      assert.strictEqual(resNoBody.status, 204);
      assert.strictEqual(resNoBody.body, undefined);

      // Explicit status override (e.g. 201 Created)
      const resCreated = HttpResponseFactory.createSuccess(201, { id: 'ord-1' });
      assert.strictEqual(resCreated.status, 201);

      // Failure response
      const resFailure = HttpResponseFactory.createFailure(
        400,
        new HttpValidationError('Bad input'),
      );
      assert.strictEqual(resFailure.status, 400);
      assert.strictEqual(resFailure.headers['content-type'], 'application/json');
      assert.strictEqual(
        (resFailure.body as unknown as { error: { code: string } }).error.code,
        'CF-HTTP-VALIDATION',
      );
    },
  );

  await t.test(
    '10. HttpErrorMapper: Maps error categories to standard and configurable status codes',
    () => {
      // Validation -> 400
      assert.strictEqual(
        HttpErrorMapper.resolveStatus(new HttpValidationError('Invalid input')),
        400,
      );
      assert.strictEqual(
        HttpErrorMapper.resolveStatus(new TransportValidationError('Invalid payload')),
        400,
      );

      // Authentication -> 401
      assert.strictEqual(
        HttpErrorMapper.resolveStatus(new CoreForgeError('Unauthorized', 'UNAUTHORIZED_ACCESS')),
        401,
      );

      // Authorization -> 403
      assert.strictEqual(
        HttpErrorMapper.resolveStatus(new CoreForgeError('Forbidden', 'FORBIDDEN_RESOURCE')),
        403,
      );

      // Not Found -> 404
      assert.strictEqual(
        HttpErrorMapper.resolveStatus(new CoreForgeError('Not found', 'NOT_FOUND')),
        404,
      );

      // Conflict -> 409
      assert.strictEqual(
        HttpErrorMapper.resolveStatus(new CoreForgeError('Conflict', 'CONFLICT_DETECTED')),
        409,
      );

      // Rate Limit -> 429
      assert.strictEqual(
        HttpErrorMapper.resolveStatus(new CoreForgeError('Rate limited', 'RATE_LIMIT_EXCEEDED')),
        429,
      );

      // Timeout -> 504
      assert.strictEqual(
        HttpErrorMapper.resolveStatus(new TransportTimeoutError('Operation timed out')),
        504,
      );

      // Cancellation: Default 499
      assert.strictEqual(
        HttpErrorMapper.resolveStatus(new TransportCancellationError('Aborted')),
        499,
      );
      assert.strictEqual(HttpErrorMapper.resolveStatus(new HttpCancellationError('Aborted')), 499);

      // Cancellation: Configurable (e.g. 408)
      assert.strictEqual(
        HttpErrorMapper.resolveStatus(new TransportCancellationError('Aborted'), {
          cancellationStatus: 408,
        }),
        408,
      );

      // Custom status mapping
      assert.strictEqual(
        HttpErrorMapper.resolveStatus(new CoreForgeError('Custom', 'CUSTOM_PAYMENT_ERROR'), {
          customStatusMap: { CUSTOM_PAYMENT_ERROR: 402 },
        }),
        402,
      );
    },
  );

  await t.test(
    '11. HttpErrorMapper: Sanitizes sensitive credentials and secret tokens from error payloads',
    () => {
      const sensitiveErr = new HttpError(
        'Failed query with Bearer secret-token-xyz and password=supersecret at postgres://user:pass@localhost:5432/db',
      );

      const errorPayload = HttpErrorMapper.toErrorPayload(sensitiveErr);
      assert.strictEqual(
        errorPayload.error.message.includes('secret-token-xyz'),
        false,
        'Token must be sanitized',
      );
      assert.strictEqual(
        errorPayload.error.message.includes('supersecret'),
        false,
        'Password must be sanitized',
      );
      assert.strictEqual(
        errorPayload.error.message.includes('postgres://user:pass'),
        false,
        'DB URI must be sanitized',
      );
      assert.strictEqual(errorPayload.error.code, 'CF-HTTP');
    },
  );

  await t.test(
    '12. HttpResponseMapper: Maps TransportResponse to HttpResponse with immutability',
    () => {
      const successTransport = TransportResponseFactory.createSuccess<{ orderId: string }>({
        orderId: 'ord-888',
      });
      const httpSuccess = HttpResponseMapper.toHttpResponse(successTransport);

      assert.strictEqual(httpSuccess.status, 200);
      assert.strictEqual((httpSuccess.body as { orderId: string }).orderId, 'ord-888');
      assert.ok(Object.isFrozen(httpSuccess));

      const failureTransport = TransportResponseFactory.createFailure(
        new HttpValidationError('Invalid email'),
      );
      const httpFailure = HttpResponseMapper.toHttpResponse(failureTransport);

      assert.strictEqual(httpFailure.status, 400);
      assert.strictEqual(
        (httpFailure.body as unknown as { error: { code: string } }).error.code,
        'CF-HTTP-VALIDATION',
      );
      assert.ok(Object.isFrozen(httpFailure));
    },
  );

  // =========================================================================
  // 5. ARCHITECTURAL BOUNDARY (Stage 1)
  // =========================================================================
  await t.test('13. Architectural boundary: Zero forbidden dependencies in @coreforge/http', () => {
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
