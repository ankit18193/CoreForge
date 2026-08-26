import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { test } from 'node:test';

import { ExecutionContextManager } from '@coreforge/execution-context';

import {
  QueryBus,
  QueryBuilder,
  QueryHandler,
  QueryHandlerNotFoundError,
  QueryHandlerRegistrationError,
  QueryStateError,
  QueryValidationError,
} from '../src/index';

test('CoreForge Application Query & Handler Resolution Engine (@coreforge/query)', async (t) => {
  await t.test('1. Lifecycle: Rejects query before start(), start() is idempotent', async () => {
    const queryBus = new QueryBus();
    assert.strictEqual(queryBus.ready, false);

    queryBus.register('GetGreeting', {
      async execute(payload: string) {
        return `Hello, ${payload}!`;
      },
    });

    await assert.rejects(
      async () => queryBus.query({ type: 'GetGreeting', payload: 'World' }),
      (err: Error) => err instanceof QueryStateError,
    );

    await queryBus.start();
    assert.strictEqual(queryBus.ready, true);

    // Idempotent start()
    await queryBus.start();
    assert.strictEqual(queryBus.ready, true);

    const result = await queryBus.query({ type: 'GetGreeting', payload: 'World' });
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.value, 'Hello, World!');
    assert.strictEqual(result.state, 'COMPLETED');

    await queryBus.stop();
  });

  await t.test(
    '2. Lifecycle: Rejection of new queries during STOPPING and after STOPPED, idempotent stop()',
    async () => {
      const queryBus = new QueryBus({ autoStart: true });
      assert.strictEqual(queryBus.ready, true);

      await queryBus.stop();
      assert.strictEqual(queryBus.ready, false);

      await assert.rejects(
        async () => queryBus.query({ type: 'Test', payload: {} }),
        (err: Error) => err instanceof QueryStateError,
      );

      // Idempotent stop()
      await queryBus.stop();
    },
  );

  await t.test(
    '3. Registration: Registration before startup works, rejected after READY',
    async () => {
      const queryBus = new QueryBus();

      const handler: QueryHandler<string, string> = {
        async execute(payload) {
          return payload;
        },
      };

      queryBus.register('Test', handler);
      await queryBus.start();

      assert.throws(
        () => queryBus.register('Another', handler),
        (err: Error) => err instanceof QueryHandlerRegistrationError,
      );

      await queryBus.stop();
    },
  );

  await t.test(
    '4. Registration: Duplicate handler registration is rejected with QueryHandlerRegistrationError',
    async () => {
      const queryBus = new QueryBus();

      const handler1: QueryHandler = {
        async execute() {
          return 1;
        },
      };
      const handler2: QueryHandler = {
        async execute() {
          return 2;
        },
      };

      queryBus.register('DuplicateQuery', handler1);

      assert.throws(
        () => queryBus.register('DuplicateQuery', handler2),
        (err: Error) => err instanceof QueryHandlerRegistrationError,
      );

      const diag = queryBus.getDiagnostics();
      assert.strictEqual(diag.registrationFailures, 1);
    },
  );

  await t.test(
    '5. Query Validation: Rejects invalid, empty, whitespace-only, and control-character query types',
    async () => {
      const queryBus = new QueryBus({ autoStart: true });

      await assert.rejects(
        async () => queryBus.query(null as unknown as { type: string; payload: unknown }),
        (err: Error) => err instanceof QueryValidationError,
      );

      await assert.rejects(
        async () => queryBus.query({ type: '', payload: {} }),
        (err: Error) => err instanceof QueryValidationError,
      );

      await assert.rejects(
        async () => queryBus.query({ type: '   ', payload: {} }),
        (err: Error) => err instanceof QueryValidationError,
      );

      await assert.rejects(
        async () => queryBus.query({ type: 'Invalid\x00QueryType', payload: {} }),
        (err: Error) => err instanceof QueryValidationError,
      );

      await queryBus.stop();
    },
  );

  await t.test(
    '6. Query Snapshotting & Isolation: Producer mutating query payload after dispatch does not affect execution',
    async () => {
      const queryBus = new QueryBus();

      let observedPayload: { page: number } | undefined;

      queryBus.register('PagedQuery', {
        async execute(payload: { page: number }) {
          await new Promise((r) => setTimeout(r, 10));
          observedPayload = payload;
          return payload.page;
        },
      });

      await queryBus.start();

      const mutablePayload = { page: 1 };
      const queryPromise = queryBus.query({
        type: 'PagedQuery',
        payload: mutablePayload,
      });

      // Mutate original producer object immediately
      mutablePayload.page = 999;

      const result = await queryPromise;
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.value, 1);
      assert.strictEqual(observedPayload?.page, 1);

      await queryBus.stop();
    },
  );

  await t.test(
    '7. Circular Reference Handling: Replaces circular structures in payload with "[Circular]" without crashing',
    async () => {
      const queryBus = new QueryBus();

      let receivedPayload: unknown;

      queryBus.register('CircularQuery', {
        async execute(payload) {
          receivedPayload = payload;
          return 'sanitized';
        },
      });

      await queryBus.start();

      const circularObj: { name: string; self?: unknown } = { name: 'cycle' };
      circularObj.self = circularObj;

      const result = await queryBus.query({
        type: 'CircularQuery',
        payload: circularObj,
      });

      assert.strictEqual(result.success, true);
      assert.strictEqual((receivedPayload as { self: string }).self, '[Circular]');

      await queryBus.stop();
    },
  );

  await t.test(
    '8. Handler Resolution & Missing Handler: Throws QueryHandlerNotFoundError and tracks diagnostics',
    async () => {
      const queryBus = new QueryBus({ autoStart: true });

      await assert.rejects(
        async () => queryBus.query({ type: 'NonExistentQuery', payload: {} }),
        (err: Error) => err instanceof QueryHandlerNotFoundError,
      );

      const diag = queryBus.getDiagnostics();
      assert.strictEqual(diag.handlerNotFound, 1);

      await queryBus.stop();
    },
  );

  await t.test(
    '9. Successful Query Execution: Returns COMPLETED result with execution metadata',
    async () => {
      const queryBus = new QueryBus();

      queryBus.register('GetUserProfile', {
        async execute(payload: { userId: string }) {
          return { userId: payload.userId, role: 'ADMIN', active: true };
        },
      });

      await queryBus.start();

      const result = await queryBus.query({
        type: 'GetUserProfile',
        payload: { userId: 'usr-999' },
      });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.state, 'COMPLETED');
      assert.strictEqual(result.queryType, 'GetUserProfile');
      assert.strictEqual(typeof result.executionId, 'string');
      assert.strictEqual(typeof result.durationMs, 'number');
      assert.deepStrictEqual(result.value, {
        userId: 'usr-999',
        role: 'ADMIN',
        active: true,
      });

      const diag = queryBus.getDiagnostics();
      assert.strictEqual(diag.totalQueries, 1);
      assert.strictEqual(diag.completedQueries, 1);
      assert.strictEqual(diag.failedQueries, 0);

      await queryBus.stop();
    },
  );

  await t.test(
    '10. Handler Failure: Returns FAILED result and increments handlerFailures',
    async () => {
      const queryBus = new QueryBus();

      queryBus.register('FailingQuery', {
        async execute() {
          throw new Error('Read replica unavailable');
        },
      });

      await queryBus.start();

      const result = await queryBus.query({
        type: 'FailingQuery',
        payload: {},
      });

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.state, 'FAILED');
      assert.strictEqual((result.error as Error).message, 'Read replica unavailable');

      const diag = queryBus.getDiagnostics();
      assert.strictEqual(diag.failedQueries, 1);
      assert.strictEqual(diag.handlerFailures, 1);

      await queryBus.stop();
    },
  );

  await t.test(
    '11. Cancellation Handling: Aborted context results in CANCELLED state and no handler execution',
    async () => {
      const contextManager = new ExecutionContextManager();
      const queryBus = new QueryBus({ contextManager });

      let handlerRan = false;

      queryBus.register('CancellableQuery', {
        async execute() {
          handlerRan = true;
          return 'executed';
        },
      });

      await queryBus.start();

      const cancelledContext = contextManager.create();
      cancelledContext.cancel();

      const result = await queryBus.query(
        { type: 'CancellableQuery', payload: {} },
        { context: cancelledContext },
      );

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.state, 'CANCELLED');
      assert.strictEqual(handlerRan, false);

      const diag = queryBus.getDiagnostics();
      assert.strictEqual(diag.cancelledQueries, 1);

      await queryBus.stop();
      await contextManager.stop();
    },
  );

  await t.test(
    '12. Execution Context Propagation: contextManager.current() resolves active context',
    async () => {
      const contextManager = new ExecutionContextManager();
      const queryBus = new QueryBus({ contextManager });

      let capturedId: string | undefined;

      queryBus.register('ContextQuery', {
        async execute(_payload, context) {
          capturedId = contextManager.current()?.executionId;
          assert.strictEqual(capturedId, context.executionId);
          return 'ok';
        },
      });

      await queryBus.start();

      const result = await queryBus.query({ type: 'ContextQuery', payload: {} });
      assert.strictEqual(result.executionId, capturedId);
      assert.strictEqual(contextManager.current(), undefined);

      await queryBus.stop();
      await contextManager.stop();
    },
  );

  await t.test(
    '13. Explicit Pipeline Order: ExecutionEngine -> InterceptorEngine -> QueryHandler',
    async () => {
      const queryBus = new QueryBus();
      const trace: string[] = [];

      // Register Execution Middleware
      queryBus.executionEngine.use({
        async execute(_input, _context, next) {
          trace.push('execution_before');
          const res = await next();
          trace.push('execution_after');
          return res;
        },
      });

      // Register Interceptor
      queryBus.interceptorEngine.use({
        async intercept(_input, _context, next) {
          trace.push('interceptor_before');
          const res = await next();
          trace.push('interceptor_after');
          return res;
        },
      });

      queryBus.register('PipelineQuery', {
        async execute(payload: string) {
          trace.push('query_handler');
          return `result:${payload}`;
        },
      });

      await queryBus.start();

      const result = await queryBus.query({ type: 'PipelineQuery', payload: 'test' });

      assert.strictEqual(result.value, 'result:test');
      assert.deepStrictEqual(trace, [
        'execution_before',
        'interceptor_before',
        'query_handler',
        'interceptor_after',
        'execution_after',
      ]);

      await queryBus.stop();
    },
  );

  await t.test('14. Result Immutability: Deep freeze protection on returned value', async () => {
    const queryBus = new QueryBus();

    queryBus.register('FreezeQuery', {
      async execute() {
        return { data: { list: [1, 2, 3] } };
      },
    });

    await queryBus.start();

    const result = await queryBus.query({ type: 'FreezeQuery', payload: {} });

    assert.throws(() => {
      (result.value as { data: { list: number[] } }).data.list.push(4);
    });

    await queryBus.stop();
  });

  await t.test(
    '15. 1,000 Concurrent Queries: High-concurrency isolation and accurate metrics',
    async () => {
      const queryBus = new QueryBus();

      queryBus.register('MultiplyQuery', {
        async execute(payload: { x: number; y: number }) {
          return payload.x * payload.y;
        },
      });

      await queryBus.start();

      const promises: Promise<void>[] = [];
      for (let i = 0; i < 1000; i++) {
        promises.push(
          queryBus.query({ type: 'MultiplyQuery', payload: { x: i, y: 2 } }).then((res) => {
            assert.strictEqual(res.success, true);
            assert.strictEqual(res.value, i * 2);
          }),
        );
      }

      await Promise.all(promises);

      const diag = queryBus.getDiagnostics();
      assert.strictEqual(diag.totalQueries, 1000);
      assert.strictEqual(diag.completedQueries, 1000);
      assert.strictEqual(diag.handlerExecutions, 1000);
      assert.strictEqual(diag.activeQueries, 0);

      await queryBus.stop();
    },
  );

  await t.test(
    '16. Diagnostics Security: Zero payloads, credentials, error stacks, or execution IDs stored',
    async () => {
      const queryBus = new QueryBus();

      queryBus.register('SecretQuery', {
        async execute(payload: { apiKey: string }) {
          return { valid: true, key: payload.apiKey };
        },
      });

      await queryBus.start();

      const result = await queryBus.query({
        type: 'SecretQuery',
        payload: { apiKey: 'super_secret_query_api_key_456' },
      });

      const diag = queryBus.getDiagnostics();
      const serialized = JSON.stringify(diag);

      assert.strictEqual(serialized.includes('super_secret_query_api_key_456'), false);
      assert.strictEqual(serialized.includes(result.executionId), false);
      assert.strictEqual(serialized.includes('apiKey'), false);

      await queryBus.stop();
    },
  );

  await t.test('17. QueryBuilder Fluent API with autoStart', async () => {
    const contextManager = new ExecutionContextManager();

    const queryBus = QueryBuilder.create()
      .withContextManager(contextManager)
      .withHandler('BuilderQuery', {
        async execute(payload: string) {
          return `queried_${payload}`;
        },
      })
      .withAutoStart(true)
      .build();

    assert.strictEqual(queryBus.ready, true);

    const result = await queryBus.query({ type: 'BuilderQuery', payload: 'data' });
    assert.strictEqual(result.value, 'queried_data');

    await queryBus.stop();
    await contextManager.stop();
  });

  await t.test(
    '18. Critical Architectural Boundary: Zero higher-layer or forbidden framework dependencies',
    async () => {
      const pkgJsonPath = path.resolve(__dirname, '../../package.json');
      const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));

      const deps = Object.keys(pkgJson.dependencies || {});
      const forbidden = [
        '@coreforge/transport',
        '@coreforge/routing',
        '@coreforge/runtime',
        '@coreforge/response',
        '@coreforge/jobs',
        '@coreforge/events',
        '@coreforge/cache',
        '@coreforge/locks',
        '@coreforge/rate-limit',
        '@coreforge/resilience',
        '@coreforge/metrics',
        '@coreforge/tracing',
        '@coreforge/logging',
        '@coreforge/config',
      ];

      for (const f of forbidden) {
        assert.strictEqual(
          deps.includes(f),
          false,
          `Forbidden dependency detected in @coreforge/query: ${f}`,
        );
      }
    },
  );
});
