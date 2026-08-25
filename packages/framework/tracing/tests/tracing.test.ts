import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { test } from 'node:test';

import {
  MemoryTraceProvider,
  SpanIdError,
  SpanIdGenerator,
  TraceBuilder,
  TraceContextError,
  TraceContextFactory,
  TraceIdError,
  TraceIdGenerator,
  TraceLimitError,
  TraceManager,
  TracingStateError,
} from '../src/index';

test('CoreForge Distributed Tracing & Correlation Context Engine (@coreforge/tracing)', async (t) => {
  await t.test(
    '1. Trace ID & Span ID Generation: Valid format and all-zero rejection',
    async () => {
      const traceId = TraceIdGenerator.generate();
      assert.strictEqual(traceId.length, 32);
      assert.strictEqual(/^[0-9a-f]{32}$/.test(traceId), true);
      assert.strictEqual(TraceIdGenerator.validate(traceId), traceId);

      const spanId = SpanIdGenerator.generate();
      assert.strictEqual(spanId.length, 16);
      assert.strictEqual(/^[0-9a-f]{16}$/.test(spanId), true);
      assert.strictEqual(SpanIdGenerator.validate(spanId), spanId);

      // Rejection of invalid IDs
      assert.throws(
        () => TraceIdGenerator.validate('short_id'),
        (err: Error) => err instanceof TraceIdError,
      );
      assert.throws(
        () => TraceIdGenerator.validate('0'.repeat(32)),
        (err: Error) => err instanceof TraceIdError,
      );
      assert.throws(
        () => SpanIdGenerator.validate('0'.repeat(16)),
        (err: Error) => err instanceof SpanIdError,
      );
    },
  );

  await t.test('2. Trace Context & Parent-Child Hierarchy: Root vs Child inheritance', async () => {
    const manager = new TraceManager();

    const rootSpan = manager.startTrace('http_request', { attributes: { route: '/users' } });
    assert.strictEqual(rootSpan.context.parentSpanId, undefined);
    assert.strictEqual(rootSpan.context.sampled, true);

    const childSpan = manager.startSpan('db_query', rootSpan.context);
    assert.strictEqual(childSpan.context.traceId, rootSpan.context.traceId);
    assert.strictEqual(childSpan.context.parentSpanId, rootSpan.context.spanId);
    assert.notStrictEqual(childSpan.context.spanId, rootSpan.context.spanId);

    // Prevent span from being its own parent
    assert.throws(
      () =>
        TraceContextFactory.create({
          traceId: rootSpan.context.traceId,
          spanId: '1234567812345678',
          parentSpanId: '1234567812345678',
          sampled: true,
        }),
      (err: Error) => err instanceof TraceContextError,
    );

    await manager.stop();
  });

  await t.test(
    '3. Scoped Asynchronous Context Propagation: withContext automatic restoration',
    async () => {
      const manager = new TraceManager();

      assert.strictEqual(manager.current(), undefined);

      const rootSpan = manager.startTrace('async_operation');

      await manager.withContext(rootSpan.context, async () => {
        assert.strictEqual(manager.current()?.traceId, rootSpan.context.traceId);
        assert.strictEqual(manager.current()?.spanId, rootSpan.context.spanId);

        // Start child span without explicit parent (inherits from async context)
        const childSpan = manager.startSpan('nested_task');
        assert.strictEqual(childSpan.context.traceId, rootSpan.context.traceId);
        assert.strictEqual(childSpan.context.parentSpanId, rootSpan.context.spanId);

        await new Promise((resolve) => setTimeout(resolve, 10));
        childSpan.end();
      });

      // Context restored after withContext
      assert.strictEqual(manager.current(), undefined);
      rootSpan.end();

      await manager.stop();
    },
  );

  await t.test(
    '4. Span Lifecycle & Idempotent end(): Preserves original duration and status mappings',
    async () => {
      const manager = new TraceManager();

      const span = manager.startTrace('order_checkout');
      await new Promise((resolve) => setTimeout(resolve, 20));

      span.end('OK');
      assert.strictEqual(span.ended, true);

      const snap1 = span.snapshot();
      assert.strictEqual(snap1.state, 'COMPLETED');
      assert.strictEqual(snap1.status, 'OK');
      assert.ok((snap1.durationMs ?? 0) >= 15);
      const initialEndTime = snap1.endTime;

      // Subsequent end() is a no-op
      span.end('ERROR');
      const snap2 = span.snapshot();
      assert.strictEqual(snap2.state, 'COMPLETED'); // Still COMPLETED
      assert.strictEqual(snap2.status, 'OK'); // Still OK
      assert.strictEqual(snap2.endTime, initialEndTime);

      await manager.stop();
    },
  );

  await t.test(
    '5. Attribute Sanitization: Case-insensitive redaction and circular reference detection',
    async () => {
      const manager = new TraceManager();
      const span = manager.startTrace('auth_attempt');

      const circularObj: Record<string, unknown> = { name: 'circular_test' };
      circularObj.self = circularObj;

      span.setAttributes({
        userId: 12345,
        password: 'super_secret_password',
        APIKEY: 'sec_key_9999',
        Authorization: 'Bearer token_123',
        cookie: 'session=xyz',
        nested: circularObj,
      });

      const snap = span.snapshot();
      assert.strictEqual(snap.attributes.userId, 12345);
      assert.strictEqual(snap.attributes.password, '[REDACTED]');
      assert.strictEqual(snap.attributes.APIKEY, '[REDACTED]');
      assert.strictEqual(snap.attributes.Authorization, '[REDACTED]');
      assert.strictEqual(snap.attributes.cookie, '[REDACTED]');

      const nested = snap.attributes.nested as Record<string, unknown>;
      assert.strictEqual(nested.name, 'circular_test');
      assert.strictEqual(nested.self, '[Circular]');

      await manager.stop();
    },
  );

  await t.test(
    '6. Non-Destructive Limit Enforcement: Limits reject operations without corrupting span',
    async () => {
      const manager = new TraceManager({
        limits: { maxAttributesPerSpan: 2, maxEventsPerSpan: 2, maxLinksPerSpan: 2 },
      });

      const span = manager.startTrace('limited_span');
      span.setAttribute('k1', 'v1');
      span.setAttribute('k2', 'v2');

      // 3rd attribute exceeds limit -> throws TraceLimitError
      assert.throws(
        () => span.setAttribute('k3', 'v3'),
        (err: Error) => err instanceof TraceLimitError,
      );

      // Existing attributes remain intact
      const snap = span.snapshot();
      assert.strictEqual(snap.attributes.k1, 'v1');
      assert.strictEqual(snap.attributes.k2, 'v2');
      assert.strictEqual(snap.attributes.k3, undefined);

      const diag = manager.getDiagnostics();
      assert.strictEqual(diag.attributeLimitRejections, 1);

      await manager.stop();
    },
  );

  await t.test(
    '7. Span Events & Links: Adding timestamped events and cross-trace links',
    async () => {
      const manager = new TraceManager();

      const spanA = manager.startTrace('trace_a');
      const spanB = manager.startTrace('trace_b');

      spanA.addEvent('cache_miss', { cacheKey: 'user:123' });
      spanA.addLink(spanB.context, { reason: 'correlated_workflow' });

      spanA.end();
      spanB.end();

      const snapA = spanA.snapshot();
      assert.strictEqual(snapA.events.length, 1);
      assert.strictEqual(snapA.events[0].name, 'cache_miss');
      assert.strictEqual(snapA.events[0].attributes?.cacheKey, 'user:123');

      assert.strictEqual(snapA.links.length, 1);
      assert.strictEqual(snapA.links[0].traceId, spanB.context.traceId);
      assert.strictEqual(snapA.links[0].spanId, spanB.context.spanId);

      await manager.stop();
    },
  );

  await t.test('8. Sampling Precedence & Unsampled Storage Semantics', async () => {
    const neverManager = new TraceManager({ sampler: { type: 'NEVER' } });
    const spanUnsampled = neverManager.startTrace('unsampled_trace');
    assert.strictEqual(spanUnsampled.context.sampled, false);
    spanUnsampled.end();

    const providerNever = neverManager.provider;
    const neverSnaps = await providerNever.snapshot();
    assert.strictEqual(neverSnaps.length, 0); // Unsampled traces not stored

    // Explicit override via TraceStartOptions
    const spanSampledOverride = neverManager.startTrace('override_trace', { sampled: true });
    assert.strictEqual(spanSampledOverride.context.sampled, true);
    spanSampledOverride.end();

    const overrideSnaps = await providerNever.snapshot(spanSampledOverride.context.traceId);
    assert.strictEqual(overrideSnaps.length, 1);

    await neverManager.stop();
  });

  await t.test('9. Provider Failure Isolation: Record errors never crash span.end()', async () => {
    const failingProvider = {
      async record(): Promise<void> {
        throw new Error('Storage write failed');
      },
      async snapshot(): Promise<never[]> {
        return [];
      },
      async clear(): Promise<void> {},
    };

    const manager = new TraceManager({}, failingProvider);
    const span = manager.startTrace('safe_span');

    // Should complete cleanly without throwing
    assert.doesNotThrow(() => span.end());
    assert.strictEqual(span.ended, true);

    await new Promise((resolve) => setImmediate(resolve));

    const diag = manager.getDiagnostics();
    assert.strictEqual(diag.providerFailures, 1);

    await manager.stop();
  });

  await t.test('10. Memory Provider Bounded Capacity & FIFO Eviction', async () => {
    const provider = new MemoryTraceProvider({ maxStoredTraces: 2, maxStoredSpansPerTrace: 2 });
    const manager = new TraceManager({}, provider);

    const t1 = manager.startTrace('trace_1');
    t1.end();
    const t2 = manager.startTrace('trace_2');
    t2.end();
    const t3 = manager.startTrace('trace_3');
    t3.end();

    // Trace 1 should have been evicted (maxStoredTraces = 2)
    const all = await provider.snapshot();
    const traceIds = new Set(all.map((s) => s.traceId));
    assert.strictEqual(traceIds.size, 2);
    assert.strictEqual(traceIds.has(t1.context.traceId), false);
    assert.strictEqual(traceIds.has(t2.context.traceId), true);
    assert.strictEqual(traceIds.has(t3.context.traceId), true);

    await manager.stop();
  });

  await t.test(
    '11. 1,000 Concurrent Spans: High-concurrency creation and context isolation',
    async () => {
      const manager = new TraceManager();

      const promises: Promise<void>[] = [];
      for (let i = 0; i < 1000; i++) {
        promises.push(
          Promise.resolve().then(async () => {
            const root = manager.startTrace(`concurrent_trace_${i}`);
            await manager.withContext(root.context, async () => {
              const child = manager.startSpan(`child_${i}`);
              assert.strictEqual(child.context.traceId, root.context.traceId);
              child.end();
            });
            root.end();
          }),
        );
      }

      await Promise.all(promises);

      const diag = manager.getDiagnostics();
      assert.strictEqual(diag.totalTraces, 1000);
      assert.strictEqual(diag.totalSpans, 2000);
      assert.strictEqual(diag.completedSpans, 2000);
      assert.strictEqual(diag.activeSpans, 0);

      await manager.stop();
    },
  );

  await t.test('12. Lifecycle Transitions & Rejection of Spans After STOPPED', async () => {
    const unstarted = new TraceManager({ autoStart: false });
    assert.strictEqual(unstarted.state, 'CREATED');
    assert.strictEqual(unstarted.ready, false);

    assert.throws(
      () => unstarted.startTrace('test'),
      (err: Error) => err instanceof TracingStateError,
    );

    await unstarted.start();
    assert.strictEqual(unstarted.state, 'READY');
    assert.strictEqual(unstarted.ready, true);

    const span = unstarted.startTrace('valid_span');
    span.end();

    await unstarted.stop();
    assert.strictEqual(unstarted.state, 'STOPPED');
    assert.strictEqual(unstarted.ready, false);

    assert.throws(
      () => unstarted.startTrace('post_stop'),
      (err: Error) => err instanceof TracingStateError,
    );
  });

  await t.test(
    '13. Diagnostics Tracking & Security: Zero payloads or metadata retained',
    async () => {
      const manager = new TraceManager();
      const span = manager.startTrace('diag_span', { attributes: { secretKey: 'top_secret' } });
      span.end();

      const diag = manager.getDiagnostics();
      assert.strictEqual(diag.totalTraces, 1);
      assert.strictEqual(diag.totalSpans, 1);
      assert.strictEqual(diag.completedSpans, 1);
      assert.ok(diag.averageDurationMs >= 0);

      const serialized = JSON.stringify(diag);
      assert.strictEqual(serialized.includes('top_secret'), false);
      assert.strictEqual(serialized.includes('diag_span'), false);

      await manager.stop();
    },
  );

  await t.test('14. TraceBuilder Fluent API: Builds customized TraceManager', async () => {
    const manager = new TraceBuilder()
      .sampler({ type: 'ALWAYS' })
      .limits({ maxAttributesPerSpan: 50 })
      .maxStoredTraces(500)
      .autoStart(true)
      .build();

    assert.strictEqual(manager.ready, true);
    const span = manager.startTrace('builder_span');
    span.end();

    const snaps = await manager.provider.snapshot(span.context.traceId);
    assert.strictEqual(snaps.length, 1);

    await manager.stop();
  });

  await t.test(
    '15. Critical Architectural Boundary: Zero higher-layer or external tracing dependencies',
    async () => {
      const pkgJsonPath = path.resolve(__dirname, '../../package.json');
      const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));

      const deps = Object.keys(pkgJson.dependencies || {});
      const forbidden = [
        '@coreforge/cache',
        '@coreforge/events',
        '@coreforge/jobs',
        '@coreforge/locks',
        '@coreforge/rate-limit',
        '@coreforge/resilience',
        '@coreforge/logging',
        '@coreforge/metrics',
        '@coreforge/config',
        '@coreforge/runtime',
        '@coreforge/transport',
        '@coreforge/routing',
        '@coreforge/execution',
        '@coreforge/response',
        '@opentelemetry/api',
        '@opentelemetry/sdk-trace-base',
        'jaeger-client',
        'zipkin',
        'dd-trace',
        'aws-xray-sdk-core',
        'prom-client',
        'redis',
      ];

      for (const f of forbidden) {
        assert.strictEqual(
          deps.includes(f),
          false,
          `Forbidden dependency detected in @coreforge/tracing: ${f}`,
        );
      }
    },
  );
});
