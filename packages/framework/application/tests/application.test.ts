import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { test } from 'node:test';

import { Dispatcher } from '@coreforge/dispatch';
import { ExecutionContextManager } from '@coreforge/execution-context';
import { QueryBus } from '@coreforge/query';

import {
  ApplicationBuilder,
  ApplicationManager,
  ApplicationRegistrationError,
  ApplicationService,
  ApplicationServiceNotFoundError,
  ApplicationStateError,
  ApplicationValidationError,
} from '../src/index';

test('CoreForge Application Service & Use-Case Orchestration Engine (@coreforge/application)', async (t) => {
  await t.test('1. Lifecycle: Rejects execute before start(), start() is idempotent', async () => {
    const manager = new ApplicationManager();
    assert.strictEqual(manager.ready, false);

    manager.register('GreetService', {
      async execute(input: { name: string }) {
        return `Hello, ${input.name}!`;
      },
    });

    await assert.rejects(
      async () => manager.execute('GreetService', { name: 'Alice' }),
      (err: Error) => err instanceof ApplicationStateError,
    );

    await manager.start();
    assert.strictEqual(manager.ready, true);

    // Idempotent start()
    await manager.start();
    assert.strictEqual(manager.ready, true);

    const result = await manager.execute('GreetService', { name: 'Alice' });
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.value, 'Hello, Alice!');
    assert.strictEqual(result.state, 'COMPLETED');

    await manager.stop();
  });

  await t.test(
    '2. Lifecycle: Rejection of new executions during STOPPING and after STOPPED, idempotent stop()',
    async () => {
      const manager = new ApplicationManager({ autoStart: true });
      assert.strictEqual(manager.ready, true);

      await manager.stop();
      assert.strictEqual(manager.ready, false);

      await assert.rejects(
        async () => manager.execute('Test', {}),
        (err: Error) => err instanceof ApplicationStateError,
      );

      // Idempotent stop()
      await manager.stop();
    },
  );

  await t.test(
    '3. Registration: Registration before startup works, rejected after READY',
    async () => {
      const manager = new ApplicationManager();

      const service: ApplicationService<string, string> = {
        async execute(input) {
          return input;
        },
      };

      manager.register('Test', service);
      await manager.start();

      assert.throws(
        () => manager.register('Another', service),
        (err: Error) => err instanceof ApplicationRegistrationError,
      );

      await manager.stop();
    },
  );

  await t.test(
    '4. Registration: Duplicate service registration is rejected with ApplicationRegistrationError',
    async () => {
      const manager = new ApplicationManager();

      const service1: ApplicationService = {
        async execute() {
          return 1;
        },
      };
      const service2: ApplicationService = {
        async execute() {
          return 2;
        },
      };

      manager.register('DuplicateService', service1);

      assert.throws(
        () => manager.register('DuplicateService', service2),
        (err: Error) => err instanceof ApplicationRegistrationError,
      );

      const diag = manager.getDiagnostics();
      assert.strictEqual(diag.registrationFailures, 1);
    },
  );

  await t.test(
    '5. Service Validation: Rejects invalid, empty, whitespace-only, and control-character service types',
    async () => {
      const manager = new ApplicationManager({ autoStart: true });

      await assert.rejects(
        async () => manager.execute('', {}),
        (err: Error) => err instanceof ApplicationValidationError,
      );

      await assert.rejects(
        async () => manager.execute('   ', {}),
        (err: Error) => err instanceof ApplicationValidationError,
      );

      await assert.rejects(
        async () => manager.execute('Invalid\x00ServiceType', {}),
        (err: Error) => err instanceof ApplicationValidationError,
      );

      await manager.stop();
    },
  );

  await t.test(
    '6. Service Resolution & Missing Service: Throws ApplicationServiceNotFoundError and tracks diagnostics',
    async () => {
      const manager = new ApplicationManager({ autoStart: true });

      await assert.rejects(
        async () => manager.execute('NonExistentService', {}),
        (err: Error) => err instanceof ApplicationServiceNotFoundError,
      );

      const diag = manager.getDiagnostics();
      assert.strictEqual(diag.serviceNotFound, 1);

      await manager.stop();
    },
  );

  await t.test(
    '7. Input Snapshotting & Isolation: Producer mutating input object after invocation does not affect execution',
    async () => {
      const manager = new ApplicationManager();

      let observedInput: { count: number } | undefined;

      manager.register('MutateInputService', {
        async execute(input: { count: number }) {
          await new Promise((r) => setTimeout(r, 10));
          observedInput = input;
          return input.count;
        },
      });

      await manager.start();

      const mutableInput = { count: 42 };
      const execPromise = manager.execute('MutateInputService', mutableInput);

      // Mutate original producer object immediately
      mutableInput.count = 9999;

      const result = await execPromise;
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.value, 42);
      assert.strictEqual(observedInput?.count, 42);

      await manager.stop();
    },
  );

  await t.test(
    '8. Circular Input Handling: Replaces circular structures in input with "[Circular]" without crashing',
    async () => {
      const manager = new ApplicationManager();

      let receivedInput: unknown;

      manager.register('CircularService', {
        async execute(input) {
          receivedInput = input;
          return 'sanitized';
        },
      });

      await manager.start();

      const circularObj: { name: string; self?: unknown } = { name: 'cycle' };
      circularObj.self = circularObj;

      const result = await manager.execute('CircularService', circularObj);

      assert.strictEqual(result.success, true);
      assert.strictEqual((receivedInput as { self: string }).self, '[Circular]');

      await manager.stop();
    },
  );

  await t.test(
    '9. Successful Service Execution: Returns COMPLETED result with execution metadata',
    async () => {
      const manager = new ApplicationManager();

      manager.register('RegisterUserUseCase', {
        async execute(input: { email: string; name: string }) {
          return { userId: 'usr-123', email: input.email, name: input.name, registered: true };
        },
      });

      await manager.start();

      const result = await manager.execute('RegisterUserUseCase', {
        email: 'user@example.com',
        name: 'John Doe',
      });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.state, 'COMPLETED');
      assert.strictEqual(result.serviceType, 'RegisterUserUseCase');
      assert.strictEqual(typeof result.executionId, 'string');
      assert.strictEqual(typeof result.durationMs, 'number');
      assert.deepStrictEqual(result.value, {
        userId: 'usr-123',
        email: 'user@example.com',
        name: 'John Doe',
        registered: true,
      });

      const diag = manager.getDiagnostics();
      assert.strictEqual(diag.totalExecutions, 1);
      assert.strictEqual(diag.completedExecutions, 1);
      assert.strictEqual(diag.failedExecutions, 0);

      await manager.stop();
    },
  );

  await t.test(
    '10. Service Failure: Returns FAILED result and increments serviceFailures',
    async () => {
      const manager = new ApplicationManager();

      manager.register('FailingService', {
        async execute() {
          throw new Error('Payment gateway unavailable');
        },
      });

      await manager.start();

      const result = await manager.execute('FailingService', {});

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.state, 'FAILED');
      assert.strictEqual((result.error as Error).message, 'Payment gateway unavailable');

      const diag = manager.getDiagnostics();
      assert.strictEqual(diag.failedExecutions, 1);
      assert.strictEqual(diag.serviceFailures, 1);

      await manager.stop();
    },
  );

  await t.test(
    '11. Cancellation Propagation: Aborted context results in CANCELLED state and no service execution',
    async () => {
      const contextManager = new ExecutionContextManager();
      const manager = new ApplicationManager({ contextManager });

      let serviceRan = false;

      manager.register('CancellableService', {
        async execute() {
          serviceRan = true;
          return 'executed';
        },
      });

      await manager.start();

      const cancelledContext = contextManager.create();
      cancelledContext.cancel();

      const result = await manager.execute('CancellableService', {}, { context: cancelledContext });

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.state, 'CANCELLED');
      assert.strictEqual(serviceRan, false);

      const diag = manager.getDiagnostics();
      assert.strictEqual(diag.cancelledExecutions, 1);

      await manager.stop();
      await contextManager.stop();
    },
  );

  await t.test(
    '12. Execution Context Propagation: contextManager.current() resolves active context',
    async () => {
      const contextManager = new ExecutionContextManager();
      const manager = new ApplicationManager({ contextManager });

      let capturedId: string | undefined;

      manager.register('ContextService', {
        async execute(_input, context) {
          capturedId = contextManager.current()?.executionId;
          assert.strictEqual(capturedId, context.executionId);
          return 'ok';
        },
      });

      await manager.start();

      const result = await manager.execute('ContextService', {});
      assert.strictEqual(result.executionId, capturedId);
      assert.strictEqual(contextManager.current(), undefined);

      await manager.stop();
      await contextManager.stop();
    },
  );

  await t.test(
    '13. Command & Query Orchestration: OperationCoordinator routes commands and queries',
    async () => {
      const dispatcher = new Dispatcher();
      dispatcher.register('CreateAccountCmd', {
        async execute(payload: { accountId: string }) {
          return { created: true, id: payload.accountId };
        },
      });

      const queryBus = new QueryBus();
      queryBus.register('GetAccountQuery', {
        async execute(payload: { accountId: string }) {
          return { id: payload.accountId, balance: 1000 };
        },
      });

      const manager = new ApplicationManager({ dispatcher, queryBus });

      manager.register('OpenAccountUseCase', {
        async execute(input: { accountId: string }) {
          const cmdRes = await manager.coordinator.dispatchCommand({
            type: 'CreateAccountCmd',
            payload: { accountId: input.accountId },
          });

          const qryRes = await manager.coordinator.executeQuery({
            type: 'GetAccountQuery',
            payload: { accountId: input.accountId },
          });

          return {
            cmd: cmdRes.value,
            query: qryRes.value,
          };
        },
      });

      await manager.start();

      const result = await manager.execute('OpenAccountUseCase', { accountId: 'acc-777' });
      assert.strictEqual(result.success, true);
      assert.deepStrictEqual(result.value, {
        cmd: { created: true, id: 'acc-777' },
        query: { id: 'acc-777', balance: 1000 },
      });

      const diag = manager.getDiagnostics();
      assert.strictEqual(diag.nestedOperations, 2);

      await manager.stop();
    },
  );

  await t.test('14. Sequential and Concurrent Nested Operations', async () => {
    const manager = new ApplicationManager();

    manager.register('BatchService', {
      async execute() {
        const seq = await manager.coordinator.executeSequential([
          async () => 10,
          async () => 20,
          async () => 30,
        ]);

        const conc = await manager.coordinator.executeConcurrent([
          async () => 100,
          async () => 200,
          async () => 300,
        ]);

        return { seq, conc };
      },
    });

    await manager.start();

    const result = await manager.execute('BatchService', {});
    assert.strictEqual(result.success, true);
    assert.deepStrictEqual(result.value, {
      seq: [10, 20, 30],
      conc: [100, 200, 300],
    });

    await manager.stop();
  });

  await t.test('15. Result Immutability: Deep freeze protection on returned value', async () => {
    const manager = new ApplicationManager();

    manager.register('FreezeService', {
      async execute() {
        return { nested: { prop: 'value' } };
      },
    });

    await manager.start();

    const result = await manager.execute('FreezeService', {});

    assert.throws(() => {
      (result.value as { nested: { prop: string } }).nested.prop = 'mutated';
    });

    await manager.stop();
  });

  await t.test(
    '16. 1,000 Concurrent Service Executions: High-concurrency isolation and accurate metrics',
    async () => {
      const manager = new ApplicationManager();

      manager.register('CalcService', {
        async execute(input: { val: number }) {
          return input.val * 2;
        },
      });

      await manager.start();

      const promises: Promise<void>[] = [];
      for (let i = 0; i < 1000; i++) {
        promises.push(
          manager.execute('CalcService', { val: i }).then((res) => {
            assert.strictEqual(res.success, true);
            assert.strictEqual(res.value, i * 2);
          }),
        );
      }

      await Promise.all(promises);

      const diag = manager.getDiagnostics();
      assert.strictEqual(diag.totalExecutions, 1000);
      assert.strictEqual(diag.completedExecutions, 1000);
      assert.strictEqual(diag.serviceExecutions, 1000);
      assert.strictEqual(diag.activeExecutions, 0);

      await manager.stop();
    },
  );

  await t.test(
    '17. Diagnostics Security: Zero payloads, credentials, error stacks, or execution IDs stored',
    async () => {
      const manager = new ApplicationManager();

      manager.register('SecurityTestService', {
        async execute(input: { authSecret: string }) {
          return { verified: true, secret: input.authSecret };
        },
      });

      await manager.start();

      const result = await manager.execute('SecurityTestService', {
        authSecret: 'super_secret_auth_token_999',
      });

      const diag = manager.getDiagnostics();
      const serialized = JSON.stringify(diag);

      assert.strictEqual(serialized.includes('super_secret_auth_token_999'), false);
      assert.strictEqual(serialized.includes(result.executionId), false);
      assert.strictEqual(serialized.includes('authSecret'), false);

      await manager.stop();
    },
  );

  await t.test('18. ApplicationBuilder Fluent API with autoStart', async () => {
    const contextManager = new ExecutionContextManager();

    const manager = ApplicationBuilder.create()
      .withContextManager(contextManager)
      .withService('BuilderService', {
        async execute(input: string) {
          return `builder_${input}`;
        },
      })
      .withAutoStart(true)
      .build();

    assert.strictEqual(manager.ready, true);

    const result = await manager.execute('BuilderService', 'payload');
    assert.strictEqual(result.value, 'builder_payload');

    await manager.stop();
    await contextManager.stop();
  });

  await t.test(
    '19. Critical Architectural Boundary: Zero higher-layer or forbidden framework dependencies',
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
          `Forbidden dependency detected in @coreforge/application: ${f}`,
        );
      }
    },
  );
});
