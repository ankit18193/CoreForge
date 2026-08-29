import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { test } from 'node:test';

import { CoreForgeError } from '@coreforge/errors';

import {
  TransportAdapter,
  TransportAdapterNotFoundError,
  TransportAdapterOptions,
  TransportCancellationError,
  TransportCapability,
  TransportConfigurationError,
  TransportDiagnosticsSnapshot,
  TransportError,
  TransportExecutionError,
  TransportExecutionOptions,
  TransportMetadata,
  TransportRegistrationError,
  TransportRequest,
  TransportResponse,
  TransportResult,
  TransportState,
  TransportStateError,
  TransportTimeoutError,
  TransportValidationError,
} from '../src/index';

test('CoreForge Transport Contracts & Adapter Abstraction (@coreforge/transport) - Stage 1', async (t) => {
  await t.test('1. Type & Contract exports are valid', () => {
    const state: TransportState = 'CREATED';
    assert.strictEqual(state, 'CREATED');

    const capabilities: TransportCapability[] = [
      'REQUEST',
      'RESPONSE',
      'STREAMING',
      'BIDIRECTIONAL',
      'CANCELLATION',
      'METADATA',
    ];
    assert.strictEqual(capabilities.length, 6);

    const metadata: TransportMetadata = { ip: '127.0.0.1', protocol: 'custom' };
    assert.strictEqual(metadata.ip, '127.0.0.1');

    const req: TransportRequest<{ msg: string }> = {
      payload: { msg: 'hello' },
      metadata,
    };
    assert.strictEqual(req.payload.msg, 'hello');

    const res: TransportResponse<{ reply: string }> = {
      success: true,
      body: { reply: 'world' },
    };
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.body?.reply, 'world');

    const adapter: TransportAdapter<{ msg: string }, { reply: string }> = {
      id: 'test-adapter',
      name: 'Test Adapter',
      priority: 10,
      capabilities: ['REQUEST', 'RESPONSE'],
      async handle(request, _context) {
        return {
          success: true,
          body: { reply: `echo: ${request.payload.msg}` },
        };
      },
    };
    assert.strictEqual(adapter.id, 'test-adapter');

    const adapterOpts: TransportAdapterOptions = {
      priority: 100,
      capabilities: ['STREAMING'],
    };
    assert.strictEqual(adapterOpts.priority, 100);

    const execOpts: TransportExecutionOptions = {
      timeoutMs: 5000,
      adapterId: 'test-adapter',
    };
    assert.strictEqual(execOpts.timeoutMs, 5000);

    const result: TransportResult<{ reply: string }> = {
      success: true,
      response: res,
      durationMs: 12.5,
    };
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.durationMs, 12.5);

    const diag: TransportDiagnosticsSnapshot = {
      adapterRegistrations: 1,
      registrationFailures: 0,
      totalRequests: 1,
      successfulRequests: 1,
      failedRequests: 0,
      cancelledRequests: 0,
      activeRequests: 0,
      adapterResolutions: 1,
      resolutionFailures: 0,
      averageDurationMs: 12.5,
      slowestDurationMs: 12.5,
    };
    assert.strictEqual(diag.totalRequests, 1);
  });

  await t.test(
    '2. Error hierarchy inherits from CoreForgeError and TransportError with correct error codes',
    () => {
      const baseErr = new TransportError('Base transport error');
      assert.ok(baseErr instanceof CoreForgeError);
      assert.ok(baseErr instanceof TransportError);
      assert.strictEqual(baseErr.code, 'CF-TRANSPORT');
      assert.strictEqual(baseErr.message, 'Base transport error');

      const configErr = new TransportConfigurationError('Invalid config');
      assert.ok(configErr instanceof TransportError);
      assert.strictEqual(configErr.code, 'CF-TRANSPORT-CONFIGURATION');

      const regErr = new TransportRegistrationError('Duplicate adapter');
      assert.ok(regErr instanceof TransportError);
      assert.strictEqual(regErr.code, 'CF-TRANSPORT-REGISTRATION');

      const notFoundErr = new TransportAdapterNotFoundError('Adapter not found');
      assert.ok(notFoundErr instanceof TransportError);
      assert.strictEqual(notFoundErr.code, 'CF-TRANSPORT-ADAPTER-NOT-FOUND');

      const stateErr = new TransportStateError('Not ready');
      assert.ok(stateErr instanceof TransportError);
      assert.strictEqual(stateErr.code, 'CF-TRANSPORT-STATE');

      const valErr = new TransportValidationError('Invalid payload');
      assert.ok(valErr instanceof TransportError);
      assert.strictEqual(valErr.code, 'CF-TRANSPORT-VALIDATION');

      const execErr = new TransportExecutionError('Execution failed');
      assert.ok(execErr instanceof TransportError);
      assert.strictEqual(execErr.code, 'CF-TRANSPORT-EXECUTION');

      const cancelErr = new TransportCancellationError('Cancelled');
      assert.ok(cancelErr instanceof TransportError);
      assert.strictEqual(cancelErr.code, 'CF-TRANSPORT-CANCELLATION');

      const timeoutErr = new TransportTimeoutError('Timed out');
      assert.ok(timeoutErr instanceof TransportError);
      assert.strictEqual(timeoutErr.code, 'CF-TRANSPORT-TIMEOUT');
    },
  );

  await t.test(
    '3. Architectural boundary: Zero forbidden dependencies in @coreforge/transport',
    () => {
      const pkgJsonPath = path.resolve(__dirname, '../../package.json');
      const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));

      const deps = Object.keys(pkgJson.dependencies || {});
      const forbidden = [
        'express',
        'fastify',
        'ws',
        'socket.io',
        'redis',
        'rabbitmq',
        'kafka',
        'amqplib',
        'kafkajs',
        'ioredis',
        'http',
        'https',
      ];

      for (const f of forbidden) {
        assert.strictEqual(
          deps.includes(f),
          false,
          `Forbidden dependency detected in @coreforge/transport: ${f}`,
        );
      }
    },
  );
});
