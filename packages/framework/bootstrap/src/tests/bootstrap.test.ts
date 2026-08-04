import * as assert from 'node:assert';
import { test } from 'node:test';

import { Module } from '@coreforge/contracts';

import { BootstrapBuilder } from '../bootstrap/BootstrapBuilder';
import {
  BootstrapInitializationError,
  BootstrapTimeoutError,
  BootstrapValidationError,
} from '../errors/BootstrapErrors';
import { BootstrapStage } from '../pipeline/BootstrapStage';
import { BootstrapState } from '../pipeline/BootstrapState';

class MockModule implements Module {
  public readonly name = 'MockModule';
  public readonly dependencies = [];
  public static started = false;
  public static stopped = false;

  public onStarted() {
    MockModule.started = true;
  }

  public onStopping() {
    MockModule.stopped = true;
  }

  public onShutdown() {
    MockModule.stopped = true;
  }
}

class FailingModule implements Module {
  public readonly name = 'FailingModule';
  public readonly dependencies = [];

  public onStarted() {
    throw new Error('Module start failed');
  }
}

test('Bootstrap Engine', async (t) => {
  await t.test('Builder - Assembles valid Configuration and Bootstrap', () => {
    const builder = new BootstrapBuilder();
    builder.registerConfig('my-config-path');
    builder.registerModule(MockModule);
    builder.setStartupTimeout(5000);

    const app = builder.build();
    assert.strictEqual(app.state, BootstrapState.CREATED);
  });

  await t.test(
    'Startup & Shutdown - Lifecycle coordinator runs and coordinates shutdown',
    async () => {
      MockModule.started = false;
      MockModule.stopped = false;

      const app = new BootstrapBuilder().registerModule(MockModule).build();

      assert.strictEqual(app.state, BootstrapState.CREATED);

      await app.start();
      assert.strictEqual(app.state, BootstrapState.RUNNING);
      assert.strictEqual(MockModule.started, true);

      await app.stop();
      assert.strictEqual(app.state, BootstrapState.STOPPED);
      assert.strictEqual(MockModule.stopped, true);
    },
  );

  await t.test('Stage Order - Executes stages in the exact order', async () => {
    const app = new BootstrapBuilder().build();
    await app.start();

    const timings = app.context.profiler.getTimings();
    const stagesRun = timings.map((timing) => timing.stage);

    const expectedOrder = [
      BootstrapStage.ENVIRONMENT,
      BootstrapStage.CONFIGURATION,
      BootstrapStage.LOGGER,
      BootstrapStage.EXCEPTION_HANDLER,
      BootstrapStage.CONTAINER,
      BootstrapStage.EVENT_BUS,
      BootstrapStage.MODULE_REGISTRATION,
      BootstrapStage.DEPENDENCY_VALIDATION,
      BootstrapStage.MODULE_STARTUP,
      BootstrapStage.RUNTIME_READY,
    ];

    assert.deepStrictEqual(stagesRun, expectedOrder);
    await app.stop();
  });

  await t.test(
    'Stage Extension - Custom stages can be registered and execute correctly',
    async () => {
      const app = new BootstrapBuilder().build();
      let customExecuted = false;

      app.pipeline.registerStage(
        'CUSTOM_STAGE',
        {
          execute() {
            customExecuted = true;
          },
        },
        { after: BootstrapStage.ENVIRONMENT },
      );

      await app.start();
      assert.strictEqual(customExecuted, true);

      const stages = app.pipeline.getStages();
      assert.ok(stages.includes('CUSTOM_STAGE'));
      assert.strictEqual(
        stages.indexOf('CUSTOM_STAGE'),
        stages.indexOf(BootstrapStage.ENVIRONMENT) + 1,
      );

      await app.stop();
    },
  );

  await t.test(
    'Failure Recovery - Rollback starts automatically when modules fail during startup',
    async () => {
      MockModule.started = false;
      MockModule.stopped = false;

      const app = new BootstrapBuilder()
        .registerModule(MockModule)
        .registerModule(FailingModule)
        .build();

      await assert.rejects(async () => {
        await app.start();
      }, BootstrapInitializationError);

      assert.strictEqual(app.state, BootstrapState.FAILED);
      assert.strictEqual(MockModule.stopped, true);
    },
  );

  await t.test('Diagnostics - Startup diagnostics metrics are recorded', async () => {
    const app = new BootstrapBuilder().build();
    await app.start();

    const diagnostics = app.diagnostics;
    assert.ok(diagnostics.startupDuration >= 0);
    assert.ok(diagnostics.startupTimestamp > 0);
    assert.strictEqual(diagnostics.frameworkVersion, '0.1.0');
    assert.strictEqual(diagnostics.nodeVersion, process.version);
    assert.strictEqual(diagnostics.platform, process.platform);
    assert.strictEqual(diagnostics.architecture, process.arch);
    assert.ok(diagnostics.processId > 0);
    assert.ok(diagnostics.memoryUsage.heapUsed > 0);

    await app.stop();
  });

  await t.test('Double Start & Double Stop - Validates state transition safety', async () => {
    const app = new BootstrapBuilder().build();
    await app.start();

    await assert.rejects(async () => {
      await app.start();
    }, BootstrapValidationError);

    await app.stop();
    await app.stop();
    assert.strictEqual(app.state, BootstrapState.STOPPED);
  });

  await t.test('Startup Timeout - Timeouts trigger BootstrapTimeoutError', async () => {
    const app = new BootstrapBuilder().setStartupTimeout(5).build();
    app.pipeline.registerStage('DELAY_STAGE', {
      async execute() {
        await new Promise((resolve) => setTimeout(resolve, 50));
      },
    });

    await assert.rejects(async () => {
      await app.start();
    }, BootstrapTimeoutError);
  });
});
