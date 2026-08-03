import * as assert from 'node:assert';
import { test } from 'node:test';

import { CoreForgeError } from '@coreforge/errors';

import { PipelinePhase } from '../lifecycle/BootstrapPipeline';
import { Runtime } from '../runtime/Runtime';
import { RuntimeState } from '../state/RuntimeState';

test('Runtime state machine transitions', async (t) => {
  await t.test('should run valid startup and shutdown lifecycle', async () => {
    const runtime = new Runtime({ environment: 'testing' });
    assert.strictEqual(runtime.state, RuntimeState.CREATED);

    await runtime.start();
    assert.strictEqual(runtime.state, RuntimeState.RUNNING);

    const status = runtime.status();
    assert.strictEqual(status.state, RuntimeState.RUNNING);
    assert.ok(status.startedAt > 0);
    assert.strictEqual(status.processId, process.pid);

    await runtime.stop();
    assert.strictEqual(runtime.state, RuntimeState.STOPPED);
  });

  await t.test('should fail when executing invalid transition direct jumps', async () => {
    const runtime = new Runtime({ environment: 'testing' });
    await assert.rejects(
      async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (runtime as any)._stateMachine.transitionTo(RuntimeState.RUNNING);
      },
      (err: unknown) => {
        return err instanceof CoreForgeError && err.code === 'INVALID_STATE_TRANSITION';
      },
    );
  });

  await t.test('should fail when calling start when already RUNNING', async () => {
    const runtime = new Runtime({ environment: 'testing' });
    await runtime.start();

    // Starting again when already RUNNING is an invalid state transition (RUNNING -> BOOTSTRAPPING)
    await assert.rejects(
      async () => {
        await runtime.start();
      },
      (err: unknown) => {
        return err instanceof CoreForgeError && err.code === 'INVALID_STATE_TRANSITION';
      },
    );

    await runtime.stop();
  });

  await t.test('should fail when calling start concurrently (double start)', async () => {
    const runtime = new Runtime({ environment: 'testing' });

    // Interleave start calls to simulate concurrency
    const p1 = runtime.start();

    await assert.rejects(
      async () => {
        await runtime.start();
      },
      (err: unknown) => {
        return err instanceof CoreForgeError && err.code === 'CONCURRENT_LIFECYCLE_OPERATION';
      },
    );

    await p1;
    await runtime.stop();
  });

  await t.test('should allow safe double stop calls', async () => {
    const runtime = new Runtime({ environment: 'testing' });
    await runtime.start();
    await runtime.stop();
    await assert.doesNotReject(async () => {
      await runtime.stop();
    });
  });

  await t.test('should transition to FAILED state if a pipeline phase throws', async () => {
    const runtime = new Runtime({ environment: 'testing' });

    runtime.pipeline.registerHook(PipelinePhase.LOAD_CONFIGURATION, () => {
      throw new Error('Database config parsing error');
    });

    await assert.rejects(
      async () => {
        await runtime.start();
      },
      (err: unknown) => {
        return err instanceof CoreForgeError && err.code === 'BOOTSTRAP_PHASE_FAILED';
      },
    );

    assert.strictEqual(runtime.state, RuntimeState.FAILED);
  });
});
