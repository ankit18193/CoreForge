import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { test } from 'node:test';

import { ComponentWiring, InfrastructureFactory, IntegrationWiringError } from '../src/index';

test('CoreForge Application Integration & End-to-End Coordination Engine (@coreforge/integration) - Stage 1', async (t) => {
  await t.test('1. InfrastructureFactory: Creates coherent Phase 7 infrastructure graph', () => {
    const graph = InfrastructureFactory.createApplicationInfrastructure();

    assert.ok(graph.contextManager, 'contextManager must exist');
    assert.ok(graph.executionEngine, 'executionEngine must exist');
    assert.ok(graph.interceptorEngine, 'interceptorEngine must exist');
    assert.ok(graph.dispatcher, 'dispatcher must exist');
    assert.ok(graph.queryBus, 'queryBus must exist');
    assert.ok(graph.eventPublisher, 'eventPublisher must exist');
    assert.ok(graph.applicationManager, 'applicationManager must exist');
    assert.ok(graph.errorEngine, 'errorEngine must exist');
    assert.ok(graph.hookManager, 'hookManager must exist');
    assert.ok(graph.kernel, 'kernel must exist');

    assert.strictEqual(Object.isFrozen(graph), true);
  });

  await t.test('2. ComponentWiring: Rejects incomplete graphs with IntegrationWiringError', () => {
    const incompleteGraph = {
      contextManager: {},
      executionEngine: {},
      // missing others
    } as unknown as import('../src/index').ApplicationInfrastructureGraph;

    assert.throws(
      () => ComponentWiring.validateAndWire(incompleteGraph),
      (err: Error) => err instanceof IntegrationWiringError,
    );
  });

  await t.test('3. Custom Component Injection: Preserves custom instances in graph', () => {
    const customGraph = InfrastructureFactory.createApplicationInfrastructure();
    const wired = InfrastructureFactory.createApplicationInfrastructure({
      contextManager: customGraph.contextManager,
      executionEngine: customGraph.executionEngine,
      interceptorEngine: customGraph.interceptorEngine,
    });

    assert.strictEqual(wired.contextManager, customGraph.contextManager);
    assert.strictEqual(wired.executionEngine, customGraph.executionEngine);
    assert.strictEqual(wired.interceptorEngine, customGraph.interceptorEngine);
  });

  await t.test(
    '4. Critical Architectural Boundary: Zero transport, broker, or database dependencies',
    () => {
      const pkgJsonPath = path.resolve(__dirname, '../../package.json');
      const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));

      const deps = Object.keys(pkgJson.dependencies || {});
      const forbidden = [
        '@coreforge/transport',
        '@coreforge/routing',
        '@coreforge/http',
        '@coreforge/response',
        '@coreforge/jobs',
        '@coreforge/cache',
        '@coreforge/locks',
        '@coreforge/rate-limit',
        '@coreforge/resilience',
        '@coreforge/metrics',
        '@coreforge/tracing',
        '@coreforge/logging',
        'redis',
        'rabbitmq',
        'kafka',
      ];

      for (const f of forbidden) {
        assert.strictEqual(
          deps.includes(f),
          false,
          `Forbidden dependency detected in @coreforge/integration: ${f}`,
        );
      }
    },
  );
});
