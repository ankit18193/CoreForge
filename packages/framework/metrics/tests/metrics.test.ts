import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { test } from 'node:test';

import {
  MetricCardinalityError,
  MetricLabelError,
  MetricLabelValidator,
  MetricName,
  MetricNameError,
  MetricRegistrationError,
  MetricsBuilder,
  MetricsManager,
  MetricsStateError,
  MetricValueError,
} from '../src/index';

test('CoreForge Metrics & Telemetry Engine (@coreforge/metrics)', async (t) => {
  await t.test(
    '1. Metric Name Validation: Rejects invalid, empty, or control-character names',
    async () => {
      assert.throws(
        () => MetricName.validate(''),
        (err: Error) => err instanceof MetricNameError,
      );
      assert.throws(
        () => MetricName.validate('   '),
        (err: Error) => err instanceof MetricNameError,
      );
      assert.throws(
        () => MetricName.validate('metric\x00name'),
        (err: Error) => err instanceof MetricNameError,
      );
      assert.throws(
        () => MetricName.validate('123_invalid_start'),
        (err: Error) => err instanceof MetricNameError,
      );

      assert.strictEqual(MetricName.validate('  http_requests_total  '), 'http_requests_total');
      assert.strictEqual(MetricName.validate('coreforge:http.requests'), 'coreforge:http.requests');
    },
  );

  await t.test(
    '2. Metric Labels: Validates, normalizes, and deterministically serializes labels',
    async () => {
      assert.throws(
        () => MetricLabelValidator.validate('not-an-object' as never),
        (err: Error) => err instanceof MetricLabelError,
      );
      assert.throws(
        () => MetricLabelValidator.validate({ 'invalid-key-with-dash': 'value' }),
        (err: Error) => err instanceof MetricLabelError,
      );
      assert.throws(
        () => MetricLabelValidator.validate({ key: 'val\x00control' }),
        (err: Error) => err instanceof MetricLabelError,
      );

      // Deterministic sorting regardless of insertion order
      const labels1 = MetricLabelValidator.validate({ status: '200', method: 'GET' });
      const labels2 = MetricLabelValidator.validate({ method: 'GET', status: '200' });

      assert.strictEqual(MetricLabelValidator.serialize(labels1), 'method="GET",status="200"');
      assert.strictEqual(MetricLabelValidator.serialize(labels2), 'method="GET",status="200"');
    },
  );

  await t.test('3. Counter Metric: Increments values and rejects negative increments', async () => {
    const manager = new MetricsManager();
    const metrics = manager.metrics();

    metrics.counter('http_requests_total').increment();
    metrics.counter('http_requests_total').increment(5);

    assert.throws(
      () => metrics.counter('http_requests_total').increment(-1),
      (err: Error) => err instanceof MetricValueError,
    );

    const snapshots = await metrics.snapshot();
    const counterSnap = snapshots.find((s) => s.name === 'http_requests_total');
    assert.ok(counterSnap);
    assert.strictEqual(counterSnap.type, 'COUNTER');
    assert.strictEqual(counterSnap.value, 6);

    await manager.stop();
  });

  await t.test('4. Gauge Metric: Set, increment, and decrement values', async () => {
    const manager = new MetricsManager();
    const metrics = manager.metrics();

    const gauge = metrics.gauge('active_connections', { env: 'prod' });
    gauge.set(10);
    gauge.increment(5);
    gauge.decrement(3);

    const snapshots = await metrics.snapshot();
    const gaugeSnap = snapshots.find((s) => s.name === 'active_connections');
    assert.ok(gaugeSnap);
    assert.strictEqual(gaugeSnap.type, 'GAUGE');
    assert.strictEqual(gaugeSnap.value, 12);
    assert.strictEqual(gaugeSnap.labels.env, 'prod');

    await manager.stop();
  });

  await t.test(
    '5. Histogram Metric: Bucket aggregation, count, sum, and cumulative distribution',
    async () => {
      const manager = new MetricsManager();
      const metrics = manager.metrics();

      metrics.register({
        name: 'request_duration_seconds',
        type: 'HISTOGRAM',
        histogram: { buckets: [0.1, 0.5, 1.0, 5.0] },
      });

      const histogram = metrics.histogram('request_duration_seconds');
      histogram.observe(0.05); // <= 0.1, 0.5, 1.0, 5.0
      histogram.observe(0.3); // <= 0.5, 1.0, 5.0
      histogram.observe(2.0); // <= 5.0
      histogram.observe(10.0); // only <= +Inf

      assert.throws(
        () => histogram.observe(-1),
        (err: Error) => err instanceof MetricValueError,
      );

      const snapshots = await metrics.snapshot();
      const histSnap = snapshots.find((s) => s.name === 'request_duration_seconds');
      assert.ok(histSnap);
      assert.strictEqual(histSnap.type, 'HISTOGRAM');
      assert.strictEqual(histSnap.count, 4);
      assert.strictEqual(Math.round((histSnap.sum ?? 0) * 100) / 100, 12.35);

      const buckets = histSnap.buckets!;
      assert.strictEqual(buckets['0.1'], 1);
      assert.strictEqual(buckets['0.5'], 2);
      assert.strictEqual(buckets['1'], 2);
      assert.strictEqual(buckets['5'], 3);
      assert.strictEqual(buckets['+Inf'], 4);

      await manager.stop();
    },
  );

  await t.test(
    '6. Timer Metric: Records elapsed duration via observeHistogram with double-stop protection',
    async () => {
      const manager = new MetricsManager();
      const metrics = manager.metrics();

      const timer = metrics.timer('db_query_time_ms', { table: 'users' });
      await new Promise((resolve) => setTimeout(resolve, 20));
      const duration = timer.stop();

      assert.ok(duration >= 15);

      // Double-stop protection
      const secondStop = timer.stop();
      assert.strictEqual(secondStop, 0);

      const snapshots = await metrics.snapshot();
      const timerSnap = snapshots.find((s) => s.name === 'db_query_time_ms');
      assert.ok(timerSnap);
      assert.strictEqual(timerSnap.count, 1);
      assert.ok((timerSnap.sum ?? 0) >= 15);

      await manager.stop();
    },
  );

  await t.test(
    '7. Metric Registration & Compatibility: Enforces unique types and compatible re-registration',
    async () => {
      const manager = new MetricsManager();
      const metrics = manager.metrics();

      metrics.register({ name: 'm1', type: 'COUNTER' });

      // Compatible re-registration is idempotent
      metrics.register({ name: 'm1', type: 'COUNTER' });

      // Incompatible type throws MetricRegistrationError
      assert.throws(
        () => metrics.register({ name: 'm1', type: 'GAUGE' }),
        (err: Error) => err instanceof MetricRegistrationError,
      );

      // Incompatible histogram buckets throw MetricRegistrationError
      metrics.register({ name: 'h1', type: 'HISTOGRAM', histogram: { buckets: [1, 5] } });
      assert.throws(
        () => metrics.register({ name: 'h1', type: 'HISTOGRAM', histogram: { buckets: [1, 10] } }),
        (err: Error) => err instanceof MetricRegistrationError,
      );

      await manager.stop();
    },
  );

  await t.test(
    '8. Per-Metric Cardinality: Existing label combinations allowed; new beyond maxCardinality rejected',
    async () => {
      const manager = new MetricsManager({ maxCardinality: 2 });
      const metrics = manager.metrics();

      // 1st unique label set
      metrics.counter('c1', { userId: '1' }).increment();
      // Repeated update to 1st label set does NOT consume extra slot
      metrics.counter('c1', { userId: '1' }).increment();

      // 2nd unique label set
      metrics.counter('c1', { userId: '2' }).increment();

      // 3rd unique label set exceeds maxCardinality = 2 -> MetricCardinalityError
      assert.throws(
        () => metrics.counter('c1', { userId: '3' }),
        (err: Error) => err instanceof MetricCardinalityError,
      );

      // But another metric 'c2' has its own independent cardinality budget!
      metrics.counter('c2', { userId: '1' }).increment();
      metrics.counter('c2', { userId: '2' }).increment();

      const diag = manager.getDiagnostics();
      assert.strictEqual(diag.cardinalityRejections, 1);

      await manager.stop();
    },
  );

  await t.test(
    '9. Snapshot Immutability: Snapshots are deep frozen and cannot mutate provider state',
    async () => {
      const manager = new MetricsManager();
      const metrics = manager.metrics();

      metrics.counter('frozen_metric', { app: 'core' }).increment(10);
      const snapshots = await metrics.snapshot();

      assert.strictEqual(Object.isFrozen(snapshots), true);
      assert.strictEqual(Object.isFrozen(snapshots[0]), true);
      assert.strictEqual(Object.isFrozen(snapshots[0].labels), true);

      await manager.stop();
    },
  );

  await t.test(
    '10. Concurrent Metric Updates: 1,000 parallel increments maintain accurate counter integrity',
    async () => {
      const manager = new MetricsManager();
      const metrics = manager.metrics();

      const promises: Promise<void>[] = [];
      for (let i = 0; i < 1000; i++) {
        promises.push(
          Promise.resolve().then(() => {
            metrics.counter('concurrent_counter', { route: '/api' }).increment(1);
          }),
        );
      }

      await Promise.all(promises);

      const snapshots = await metrics.snapshot();
      const snap = snapshots.find((s) => s.name === 'concurrent_counter');
      assert.ok(snap);
      assert.strictEqual(snap.value, 1000);

      await manager.stop();
    },
  );

  await t.test(
    '11. Lifecycle Matrix: Rejects all metric operations before READY and after STOPPED',
    async () => {
      const unstarted = new MetricsManager({ autoStart: false });
      assert.strictEqual(unstarted.state, 'CREATED');
      assert.strictEqual(unstarted.ready, false);

      const unstartedMetrics = unstarted.metrics();
      assert.throws(
        () => unstartedMetrics.counter('test').increment(),
        (err: Error) => err instanceof MetricsStateError,
      );
      await assert.rejects(
        async () => unstartedMetrics.snapshot(),
        (err: Error) => err instanceof MetricsStateError,
      );

      await unstarted.start();
      assert.strictEqual(unstarted.state, 'READY');
      assert.strictEqual(unstarted.ready, true);

      // Idempotent start
      await unstarted.start();
      assert.strictEqual(unstarted.state, 'READY');

      unstartedMetrics.counter('test').increment();

      await unstarted.stop();
      assert.strictEqual(unstarted.state, 'STOPPED');
      assert.strictEqual(unstarted.ready, false);

      // Idempotent stop
      await unstarted.stop();
      assert.strictEqual(unstarted.state, 'STOPPED');

      assert.throws(
        () => unstartedMetrics.counter('test').increment(),
        (err: Error) => err instanceof MetricsStateError,
      );
      await assert.rejects(
        async () => unstartedMetrics.snapshot(),
        (err: Error) => err instanceof MetricsStateError,
      );
    },
  );

  await t.test(
    '12. Diagnostics Tracking & Security: Tracks operations and never retains sensitive payloads',
    async () => {
      const manager = new MetricsManager();
      const metrics = manager.metrics();

      metrics.counter('c_diag').increment(5);
      metrics.gauge('g_diag').set(100);
      metrics.histogram('h_diag').observe(0.5);

      const timer = metrics.timer('t_diag');
      timer.stop();

      const diag = manager.getDiagnostics();
      assert.strictEqual(diag.totalCounterUpdates, 1);
      assert.strictEqual(diag.totalGaugeUpdates, 1);
      assert.strictEqual(diag.totalHistogramObservations, 1);
      assert.strictEqual(diag.totalTimerObservations, 1);
      assert.ok(diag.averageOperationLatencyMs >= 0);

      const serialized = JSON.stringify(diag);
      assert.strictEqual(serialized.includes('c_diag'), false);
      assert.strictEqual(serialized.includes('g_diag'), false);

      await manager.stop();
    },
  );

  await t.test('13. Reset and Clear: Resets specific metric or clears all metrics', async () => {
    const manager = new MetricsManager();
    const metrics = manager.metrics();

    metrics.counter('m1').increment(10);
    metrics.counter('m2').increment(20);

    await metrics.reset('m1');
    let snaps = await metrics.snapshot();
    assert.strictEqual(
      snaps.find((s) => s.name === 'm1'),
      undefined,
    );
    assert.ok(snaps.find((s) => s.name === 'm2'));

    await metrics.clear();
    snaps = await metrics.snapshot();
    assert.strictEqual(snaps.length, 0);

    await manager.stop();
  });

  await t.test(
    '14. Multiple Manager Isolation: Separate MetricsManager instances have zero cross-talk',
    async () => {
      const managerA = new MetricsManager();
      const managerB = new MetricsManager();

      managerA.metrics().counter('shared_name').increment(10);
      managerB.metrics().counter('shared_name').increment(25);

      const snapsA = await managerA.metrics().snapshot();
      const snapsB = await managerB.metrics().snapshot();

      assert.strictEqual(snapsA.find((s) => s.name === 'shared_name')?.value, 10);
      assert.strictEqual(snapsB.find((s) => s.name === 'shared_name')?.value, 25);

      await managerA.stop();
      await managerB.stop();
    },
  );

  await t.test(
    '15. MetricsBuilder Fluent API: Builds custom configured metrics manager',
    async () => {
      const manager = new MetricsBuilder().maxCardinality(500).autoStart(false).build();

      assert.strictEqual(manager.ready, false);
      await manager.start();
      assert.strictEqual(manager.ready, true);

      manager.metrics().counter('builder_counter').increment(3);
      const snaps = await manager.metrics().snapshot();
      assert.strictEqual(snaps.find((s) => s.name === 'builder_counter')?.value, 3);

      await manager.stop();
    },
  );

  await t.test(
    '16. Critical Architectural Boundary: Zero higher-layer or external metrics dependencies',
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
        '@coreforge/config',
        '@coreforge/runtime',
        '@coreforge/transport',
        '@coreforge/routing',
        '@coreforge/execution',
        '@coreforge/response',
        'prom-client',
        '@opentelemetry/api',
        '@opentelemetry/sdk-metrics',
        'statsd',
        'datadog',
        'prometheus',
        'redis',
      ];

      for (const f of forbidden) {
        assert.strictEqual(
          deps.includes(f),
          false,
          `Forbidden dependency detected in @coreforge/metrics: ${f}`,
        );
      }
    },
  );
});
