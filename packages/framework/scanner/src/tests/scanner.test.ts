import * as assert from 'node:assert';
import { test } from 'node:test';

import { CompilationResult, CompilationArtifact } from '@coreforge/contracts';

import {
  RegistrationConflictError,
  RegistrationOrderingError,
  ScannerValidationError,
} from '../errors/ScannerErrors';
import { RegistrationGraph } from '../graph/RegistrationGraph';
import { RegistrationGraphValidator } from '../graph/RegistrationGraphValidator';
import { ScannerState } from '../lifecycle/ScannerState';
import { ApplicationScanner } from '../scanner/ApplicationScanner';
import { ScannerBuilder } from '../scanner/ScannerBuilder';

test('Application Scanner & Registration Engine Package', async (t) => {
  await t.test('Registration Graph builds correctly and has deterministic depth & size', () => {
    const graph = new RegistrationGraph();
    graph.addNode('mod-1', 'MODULE', []);
    graph.addNode('mod-2', 'MODULE', ['mod-1']);
    graph.addNode('prov-1', 'PROVIDER', ['mod-2']);

    assert.strictEqual(graph.size, 3);
    assert.strictEqual(graph.getDepth(), 3);
    assert.ok(graph.hasNode('prov-1'));

    const nodes = graph.getNodes();
    assert.strictEqual(nodes.length, 3);
  });

  await t.test('Registration Graph Validator cycle validation', () => {
    const graph = new RegistrationGraph();
    graph.addNode('mod-1', 'MODULE', ['mod-2']);
    graph.addNode('mod-2', 'MODULE', ['mod-1']);

    const validator = new RegistrationGraphValidator();
    assert.throws(() => {
      validator.validate(graph);
    }, RegistrationOrderingError);
  });

  await t.test('Registration Graph Validator orphan validation', () => {
    const graph = new RegistrationGraph();
    graph.addNode('mod-1', 'MODULE', ['missing-module']);

    const validator = new RegistrationGraphValidator();
    assert.throws(() => {
      validator.validate(graph);
    }, ScannerValidationError);
  });

  await t.test('Successful scanning and deterministic ordering', async () => {
    const compilation: CompilationResult = {
      application: {
        modules: [
          { id: 'mod-2', name: 'Module2', dependencies: ['mod-1'] },
          { id: 'mod-1', name: 'Module1', dependencies: [] },
        ],
        controllers: [{ id: 'ctrl-1', name: 'Controller1', parentId: 'mod-2' }],
        providers: [{ id: 'prov-1', parentId: 'mod-1', serviceToken: 'Token1', scope: 'SINGLETON' }],
        routes: [{ id: 'route-1', parentId: 'ctrl-1', path: '/users', method: 'GET' }],
        middleware: [],
        interceptors: [],
        security: [],
      } as CompilationArtifact,
    };

    const builder = new ScannerBuilder();
    const scanner = new ApplicationScanner(builder.build());

    assert.strictEqual(scanner.state, ScannerState.CREATED);

    const result = await scanner.scan(compilation);
    assert.strictEqual(scanner.state, ScannerState.READY);

    const regs = result.registrations;
    const indices = new Map(regs.map((r, i) => [r.id, i]));

    assert.ok(indices.get('mod-1')! < indices.get('mod-2')!);
    assert.ok(indices.get('mod-1')! < indices.get('prov-1')!);
    assert.ok(indices.get('mod-2')! < indices.get('ctrl-1')!);
    assert.ok(indices.get('ctrl-1')! < indices.get('route-1')!);

    assert.throws(() => {
      (regs as unknown as unknown[])[0] = null;
    });
    assert.throws(() => {
      (result as unknown as { registrations: unknown[] }).registrations = [];
    });

    const snapshot = scanner.diagnostics.getSnapshot();
    assert.strictEqual(snapshot.registrationGraphSize, 5);
    assert.strictEqual(snapshot.graphDepth, 4);
    assert.strictEqual(snapshot.validationFailures, 0);
  });

  await t.test('Duplicate registration validation fail', async () => {
    const compilation: CompilationResult = {
      application: {
        modules: [{ id: 'mod-1', name: 'Module1', dependencies: [] }],
        controllers: [
          { id: 'ctrl-dup', name: 'Controller1', parentId: 'mod-1' },
          { id: 'ctrl-dup', name: 'Controller2', parentId: 'mod-1' },
        ],
        providers: [],
        routes: [],
        middleware: [],
        interceptors: [],
        security: [],
      } as CompilationArtifact,
    };

    const builder = new ScannerBuilder();
    const scanner = new ApplicationScanner(builder.build());

    await assert.rejects(async () => {
      await scanner.scan(compilation);
    }, RegistrationConflictError);

    assert.strictEqual(scanner.state, ScannerState.FAILED);
    assert.strictEqual(scanner.diagnostics.getSnapshot().validationFailures, 1);
  });
});
