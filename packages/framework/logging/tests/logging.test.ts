import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { test } from 'node:test';

import {
  ConsoleLogSink,
  LogErrorSerializer,
  LogLevelUtil,
  LogPipelineBuilder,
  LogProcessor,
  LogSecretMasker,
  LogSink,
  Logger,
  LoggerBuilder,
  LoggerFactory,
  LoggingSerializationError,
  MemoryLogSink,
} from '../src/index';

test('CoreForge Structured Logging & Log Pipeline Engine (@coreforge/logging)', async (t) => {
  await t.test(
    '1. Log Level Ordering: Enforces TRACE < DEBUG < INFO < WARN < ERROR < FATAL numeric hierarchy',
    async () => {
      assert.strictEqual(LogLevelUtil.isLogLevelEnabled('INFO', 'INFO'), true);
      assert.strictEqual(LogLevelUtil.isLogLevelEnabled('INFO', 'WARN'), true);
      assert.strictEqual(LogLevelUtil.isLogLevelEnabled('INFO', 'ERROR'), true);
      assert.strictEqual(LogLevelUtil.isLogLevelEnabled('INFO', 'FATAL'), true);
      assert.strictEqual(LogLevelUtil.isLogLevelEnabled('INFO', 'DEBUG'), false);
      assert.strictEqual(LogLevelUtil.isLogLevelEnabled('INFO', 'TRACE'), false);

      assert.strictEqual(LogLevelUtil.isLogLevelEnabled('WARN', 'INFO'), false);
      assert.strictEqual(LogLevelUtil.isLogLevelEnabled('ERROR', 'WARN'), false);
    },
  );

  await t.test(
    '2. Minimum Level Filtering: Sinks only receive records meeting or exceeding configured level',
    async () => {
      const sink = new MemoryLogSink();
      const pipeline = new LogPipelineBuilder().setMinimumLevel('WARN').addSink(sink).build();

      const logger = new Logger(pipeline);
      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      const records = sink.records();
      assert.strictEqual(records.length, 2);
      assert.strictEqual(records[0].level, 'WARN');
      assert.strictEqual(records[0].message, 'warn message');
      assert.strictEqual(records[1].level, 'ERROR');
      assert.strictEqual(records[1].message, 'error message');
    },
  );

  await t.test(
    '3. Structured LogRecord Creation: Emits complete, normalized structured log records',
    async () => {
      const sink = new MemoryLogSink();
      const pipeline = new LogPipelineBuilder().setMinimumLevel('TRACE').addSink(sink).build();

      const logger = new Logger(pipeline, { service: 'payment-svc', env: 'test' });
      logger.info('Order processed successfully', { orderId: 'ord-123', amount: 99.5 });

      const records = sink.records();
      assert.strictEqual(records.length, 1);
      const record = records[0];

      assert.strictEqual(record.level, 'INFO');
      assert.strictEqual(record.message, 'Order processed successfully');
      assert.ok(record.timestamp > 0);
      assert.deepStrictEqual(record.context, { service: 'payment-svc', env: 'test' });
      assert.deepStrictEqual(record.metadata, { orderId: 'ord-123', amount: 99.5 });
      assert.strictEqual(record.error, undefined);
    },
  );

  await t.test(
    '4. Immutable Records: Emitted LogRecord and its nested objects are deeply frozen',
    async () => {
      const sink = new MemoryLogSink();
      const pipeline = new LogPipelineBuilder().addSink(sink).build();
      const logger = new Logger(pipeline, { tenant: 'alpha' });

      const meta = { nested: { key: 'original' } };
      logger.info('Test record', meta);

      const record = sink.records()[0];
      assert.ok(Object.isFrozen(record));
      assert.ok(Object.isFrozen(record.context));
      assert.ok(Object.isFrozen(record.metadata));
      assert.ok(Object.isFrozen((record.metadata as Record<string, unknown>).nested));

      assert.throws(() => {
        (record as unknown as Record<string, unknown>).message = 'mutated';
      });
      assert.throws(() => {
        (record.metadata as Record<string, unknown>).newKey = 'mutated';
      });
    },
  );

  await t.test(
    '5. Child Logger Context Inheritance: Child loggers inherit parent context without mutating parent',
    async () => {
      const sink = new MemoryLogSink();
      const pipeline = new LogPipelineBuilder().addSink(sink).build();

      const parent = new Logger(pipeline, { service: 'gateway', region: 'us-east' });
      const child = parent.child({ correlationId: 'corr-001', module: 'auth' });
      const grandChild = child.child({ operation: 'verifyToken', module: 'auth-tokens' });

      parent.info('Parent event');
      child.info('Child event');
      grandChild.info('Grandchild event');

      const records = sink.records();
      assert.strictEqual(records.length, 3);

      assert.deepStrictEqual(records[0].context, { service: 'gateway', region: 'us-east' });
      assert.deepStrictEqual(records[1].context, {
        service: 'gateway',
        region: 'us-east',
        correlationId: 'corr-001',
        module: 'auth',
      });
      assert.deepStrictEqual(records[2].context, {
        service: 'gateway',
        region: 'us-east',
        correlationId: 'corr-001',
        module: 'auth-tokens', // Overridden by grandchild
        operation: 'verifyToken',
      });

      // Verify parent was never mutated
      assert.deepStrictEqual(parent.context, { service: 'gateway', region: 'us-east' });
    },
  );

  await t.test(
    '6. Error Serialization: Converts Error and cause chains into structured LogErrorDescriptor',
    async () => {
      const sink = new MemoryLogSink();
      const pipeline = new LogPipelineBuilder().addSink(sink).build();
      const logger = new Logger(pipeline);

      const causeErr = new Error('Database connection failed');
      const rootErr = new Error('Query execution failed', { cause: causeErr });
      (rootErr as Error & { code: string }).code = 'ERR_DB_QUERY';

      logger.error('Failed to execute database query', { queryId: 'q-42' }, rootErr);

      const record = sink.records()[0];
      assert.ok(record.error);
      assert.strictEqual(record.error.name, 'Error');
      assert.strictEqual(record.error.message, 'Query execution failed');
      assert.strictEqual(record.error.code, 'ERR_DB_QUERY');
      assert.ok(record.error.stack?.includes('Query execution failed'));
      assert.ok(record.error.cause);
      assert.strictEqual(record.error.cause.message, 'Database connection failed');
    },
  );

  await t.test(
    '7. Circular Error Cause Handling: Circular causes are safely serialized as [Circular]',
    async () => {
      const serializer = new LogErrorSerializer();

      const errA = new Error('Error A');
      const errB = new Error('Error B');
      (errA as Error & { cause: unknown }).cause = errB;
      (errB as Error & { cause: unknown }).cause = errA; // Circular reference

      const descriptor = serializer.serialize(errA);
      assert.ok(descriptor);
      assert.strictEqual(descriptor.message, 'Error A');
      assert.ok(descriptor.cause);
      assert.strictEqual(descriptor.cause.message, 'Error B');
      assert.ok(descriptor.cause.cause);
      assert.strictEqual(descriptor.cause.cause.message, '[Circular]');
    },
  );

  await t.test(
    '8. Mandatory Redaction Boundary: Redacts sensitive keys before records reach sinks',
    async () => {
      const sink = new MemoryLogSink();
      const pipeline = new LogPipelineBuilder()
        .addRedactionKey('customSecret')
        .addSink(sink)
        .build();

      const logger = new Logger(pipeline, { api_token: 'secret-token-123' });
      logger.info('User login event', {
        username: 'alice',
        password: 'super-password-xyz',
        authSecret: 'jwt-key',
        customSecret: 'my-custom-value',
        nested: {
          apiKey: 'key-999',
          safeField: 'safe-value',
        },
      });

      const record = sink.records()[0];
      assert.strictEqual(record.context.api_token, '[REDACTED]');
      assert.strictEqual((record.metadata as Record<string, unknown>).username, 'alice');
      assert.strictEqual((record.metadata as Record<string, unknown>).password, '[REDACTED]');
      assert.strictEqual((record.metadata as Record<string, unknown>).authSecret, '[REDACTED]');
      assert.strictEqual((record.metadata as Record<string, unknown>).customSecret, '[REDACTED]');

      const nested = (record.metadata as Record<string, unknown>).nested as Record<string, unknown>;
      assert.strictEqual(nested.apiKey, '[REDACTED]');
      assert.strictEqual(nested.safeField, 'safe-value');
    },
  );

  await t.test(
    '9. Nested Arrays & Objects Redaction: Recursively sanitizes arrays and nested object hierarchies',
    async () => {
      const masker = new LogSecretMasker();
      const input = {
        users: [
          { name: 'Bob', password: 'pass1' },
          { name: 'Charlie', token: 'tok2' },
        ],
      };

      const masked = masker.mask(input) as {
        users: Array<{ name: string; password?: string; token?: string }>;
      };
      assert.strictEqual(masked.users[0].name, 'Bob');
      assert.strictEqual(masked.users[0].password, '[REDACTED]');
      assert.strictEqual(masked.users[1].name, 'Charlie');
      assert.strictEqual(masked.users[1].token, '[REDACTED]');
    },
  );

  await t.test(
    '10. Circular Metadata Handling: Metadata circular references become [Circular] without throwing',
    async () => {
      const sink = new MemoryLogSink();
      const pipeline = new LogPipelineBuilder().addSink(sink).build();
      const logger = new Logger(pipeline);

      const circularObj: Record<string, unknown> = { key: 'initial' };
      circularObj.self = circularObj;

      logger.info('Event with circular object', { payload: circularObj });

      const record = sink.records()[0];
      const payload = (record.metadata as Record<string, unknown>).payload as Record<
        string,
        unknown
      >;
      assert.strictEqual(payload.key, 'initial');
      assert.strictEqual(payload.self, '[Circular]');
    },
  );

  await t.test(
    '11. Processor Ordering & Transformation: Processors execute in registration order',
    async () => {
      const sink = new MemoryLogSink();

      const proc1: LogProcessor = {
        name: 'Proc1',
        process: (rec) =>
          Object.freeze({
            ...rec,
            metadata: { ...rec.metadata, step1: 'passed' },
          }),
      };

      const proc2: LogProcessor = {
        name: 'Proc2',
        process: (rec) =>
          Object.freeze({
            ...rec,
            metadata: { ...rec.metadata, step2: 'passed', previous: rec.metadata?.step1 },
          }),
      };

      const pipeline = new LogPipelineBuilder()
        .addProcessor(proc1)
        .addProcessor(proc2)
        .addSink(sink)
        .build();

      const logger = new Logger(pipeline);
      logger.info('Pipeline transformation test');

      const record = sink.records()[0];
      assert.strictEqual((record.metadata as Record<string, unknown>).step1, 'passed');
      assert.strictEqual((record.metadata as Record<string, unknown>).step2, 'passed');
      assert.strictEqual((record.metadata as Record<string, unknown>).previous, 'passed');
    },
  );

  await t.test(
    '12. Processor Failure Isolation: Broken processor is skipped and pipeline continues',
    async () => {
      const sink = new MemoryLogSink();

      const brokenProc: LogProcessor = {
        name: 'BrokenProcessor',
        process: () => {
          throw new Error('Processor crash');
        },
      };

      const goodProc: LogProcessor = {
        name: 'GoodProcessor',
        process: (rec) =>
          Object.freeze({
            ...rec,
            metadata: { ...rec.metadata, good: true },
          }),
      };

      const pipeline = new LogPipelineBuilder()
        .addProcessor(brokenProc)
        .addProcessor(goodProc)
        .addSink(sink)
        .build();

      const logger = new Logger(pipeline);
      logger.info('Resilience test');

      const record = sink.records()[0];
      assert.strictEqual((record.metadata as Record<string, unknown>).good, true);
      assert.strictEqual(pipeline.diagnostics.processorFailures, 1);
    },
  );

  await t.test(
    '13. Multiple Sink Execution & Sink Failure Isolation: Broken sink does not crash logger or block other sinks',
    async () => {
      const sink1 = new MemoryLogSink('Sink1');
      const brokenSink: LogSink = {
        name: 'BrokenSink',
        write: () => {
          throw new Error('Disk write failed');
        },
      };
      const sink2 = new MemoryLogSink('Sink2');

      const pipeline = new LogPipelineBuilder()
        .addSink(sink1)
        .addSink(brokenSink)
        .addSink(sink2)
        .build();

      const logger = new Logger(pipeline);
      logger.info('Multi-sink test');

      assert.strictEqual(sink1.records().length, 1);
      assert.strictEqual(sink2.records().length, 1);
      assert.strictEqual(pipeline.diagnostics.sinkFailures, 1);
    },
  );

  await t.test(
    '14. Sink Flush & Close Lifecycle: Graceful shutdown flushes and closes sinks',
    async () => {
      let flushed = false;
      let closed = false;

      const sink: LogSink = {
        name: 'FlushableSink',
        write: () => {},
        flush: async () => {
          flushed = true;
        },
        close: async () => {
          closed = true;
        },
      };

      const pipeline = new LogPipelineBuilder().addSink(sink).build();
      const logger = new Logger(pipeline);

      await logger.stop();

      assert.strictEqual(flushed, true);
      assert.strictEqual(closed, true);
      assert.strictEqual(logger.state, 'STOPPED');
    },
  );

  await t.test(
    '15. ConsoleLogSink Structured Output: Emits JSON lines to appropriate output stream',
    async () => {
      let stdoutContent = '';
      let stderrContent = '';

      const consoleSink = new ConsoleLogSink({
        outStream: {
          write: (str) => {
            stdoutContent += str;
          },
        },
        errStream: {
          write: (str) => {
            stderrContent += str;
          },
        },
      });

      const pipeline = new LogPipelineBuilder()
        .setMinimumLevel('TRACE')
        .addSink(consoleSink)
        .build();

      const logger = new Logger(pipeline);
      logger.info('Info message to stdout');
      logger.error('Error message to stderr');

      assert.ok(stdoutContent.includes('"level":"INFO"'));
      assert.ok(stdoutContent.includes('Info message to stdout'));

      assert.ok(stderrContent.includes('"level":"ERROR"'));
      assert.ok(stderrContent.includes('Error message to stderr'));
    },
  );

  await t.test(
    '16. Diagnostics Metrics: Accurate metrics tracking with zero payload or secret retention',
    async () => {
      const sink = new MemoryLogSink();
      const pipeline = new LogPipelineBuilder().setMinimumLevel('DEBUG').addSink(sink).build();

      const logger = new Logger(pipeline);
      logger.debug('Debug log');
      logger.info('Info log');
      logger.warn('Warn log');
      logger.error('Error log');

      const diag = logger.diagnostics;
      assert.strictEqual(diag.totalLogs, 4);
      assert.strictEqual(diag.logsByLevel.DEBUG, 1);
      assert.strictEqual(diag.logsByLevel.INFO, 1);
      assert.strictEqual(diag.logsByLevel.WARN, 1);
      assert.strictEqual(diag.logsByLevel.ERROR, 1);
      assert.strictEqual(diag.logsByLevel.FATAL, 0);
      assert.ok(diag.averageProcessingDurationMs >= 0);

      // Verify diagnostics snapshot contains no payloads or message text
      const diagStr = JSON.stringify(diag);
      assert.ok(!diagStr.includes('Debug log'));
      assert.ok(!diagStr.includes('Info log'));
    },
  );

  await t.test(
    '17. Safe Post-Shutdown Behavior: Logging after STOPPED is a safe no-op',
    async () => {
      const sink = new MemoryLogSink();
      const pipeline = new LogPipelineBuilder().addSink(sink).build();
      const logger = new Logger(pipeline);

      await logger.stop();
      assert.strictEqual(logger.state, 'STOPPED');

      // Should not throw and should not emit to sink
      logger.info('Message after stop');
      assert.strictEqual(sink.records().length, 0);
    },
  );

  await t.test(
    '18. Flexible Error Overloads: Correctly handles (message, error) and (message, metadata, error)',
    async () => {
      const sink = new MemoryLogSink();
      const pipeline = new LogPipelineBuilder().addSink(sink).build();
      const logger = new Logger(pipeline);

      const err1 = new Error('Direct error');
      const err2 = new Error('Error with metadata');

      logger.error('Direct error message', err1);
      logger.error('Metadata error message', { requestId: 'req-99' }, err2);

      const records = sink.records();
      assert.strictEqual(records.length, 2);

      assert.strictEqual(records[0].error?.message, 'Direct error');
      assert.strictEqual(records[0].metadata, undefined);

      assert.strictEqual(records[1].error?.message, 'Error with metadata');
      assert.deepStrictEqual(records[1].metadata, { requestId: 'req-99' });
    },
  );

  await t.test(
    '19. Message Validation & Truncation: Rejects non-string messages and truncates oversized strings',
    async () => {
      const sink = new MemoryLogSink();
      const pipeline = new LogPipelineBuilder().addSink(sink).build();
      const logger = new Logger(pipeline, {}, { maxMessageLength: 20 });

      assert.throws(() => {
        (logger as unknown as { info: (msg: unknown) => void }).info(12345);
      }, LoggingSerializationError);

      logger.info('This is an extremely long message that should be truncated');
      const record = sink.records()[0];
      assert.strictEqual(record.message, 'This is an extremely... [TRUNCATED]');
    },
  );

  await t.test(
    '20. Concurrent Logger Isolation: 1,000 parallel logger operations maintain isolated context and state',
    async () => {
      const sink = new MemoryLogSink();
      const factory = new LoggerFactory({ sinks: [sink], autoStart: true });

      const promises: Promise<void>[] = [];
      for (let i = 0; i < 1000; i++) {
        promises.push(
          Promise.resolve().then(() => {
            const logger = factory.create({ tenantId: `tenant-${i}` });
            logger.info(`Operation ${i}`, { index: i });
          }),
        );
      }

      await Promise.all(promises);
      const records = sink.records();
      assert.strictEqual(records.length, 1000);

      // Verify no cross-talk in contexts
      for (let i = 0; i < 1000; i++) {
        const matching = records.find((r) => r.message === `Operation ${i}`);
        assert.ok(matching);
        assert.strictEqual(matching.context.tenantId, `tenant-${i}`);
        assert.strictEqual((matching.metadata as Record<string, unknown>).index, i);
      }
    },
  );

  await t.test(
    '21. Multi-Factory Isolation: Multiple LoggerFactory instances operate with completely isolated pipelines',
    async () => {
      const sinkA = new MemoryLogSink('SinkA');
      const sinkB = new MemoryLogSink('SinkB');

      const factoryA = new LoggerFactory({ sinks: [sinkA], minimumLevel: 'INFO' });
      const factoryB = new LoggerFactory({ sinks: [sinkB], minimumLevel: 'ERROR' });

      const loggerA = factoryA.create({ app: 'AppA' });
      const loggerB = factoryB.create({ app: 'AppB' });

      loggerA.info('Info from A');
      loggerB.info('Info from B'); // Filtered by B's ERROR minimum level
      loggerB.error('Error from B');

      assert.strictEqual(sinkA.records().length, 1);
      assert.strictEqual(sinkA.records()[0].message, 'Info from A');

      assert.strictEqual(sinkB.records().length, 1);
      assert.strictEqual(sinkB.records()[0].message, 'Error from B');
    },
  );

  await t.test(
    '22. LoggerBuilder Fluent API: Builds customized logger with all options configured',
    async () => {
      const sink = new MemoryLogSink();
      const logger = new LoggerBuilder()
        .setMinimumLevel('DEBUG')
        .addSink(sink)
        .addRedactionKey('secretField')
        .setContext({ env: 'staging' })
        .setMaxMessageLength(50)
        .build();

      logger.debug('Built successfully', { secretField: 'top-secret' });

      const record = sink.records()[0];
      assert.strictEqual(record.level, 'DEBUG');
      assert.strictEqual(record.context.env, 'staging');
      assert.strictEqual((record.metadata as Record<string, unknown>).secretField, '[REDACTED]');
    },
  );

  await t.test(
    '23. Critical Architectural Boundary: Logging package has zero reverse dependencies on higher layers',
    async () => {
      const loggingSrcDir = path.resolve(__dirname, '../src');
      const forbiddenPackages = [
        '@coreforge/decorators',
        '@coreforge/di',
        '@coreforge/request-context',
        '@coreforge/parameter-binding',
        '@coreforge/routing',
        '@coreforge/execution',
        '@coreforge/response',
        '@coreforge/exceptions',
        '@coreforge/transport',
        '@coreforge/runtime',
      ];

      const files = fs.readdirSync(loggingSrcDir, { recursive: true }) as string[];
      for (const file of files) {
        if (typeof file === 'string' && file.endsWith('.ts')) {
          const content = fs.readFileSync(path.join(loggingSrcDir, file), 'utf-8');
          for (const pkg of forbiddenPackages) {
            assert.ok(
              !content.includes(pkg),
              `@coreforge/logging source file ${file} must not depend on forbidden package ${pkg}`,
            );
          }
        }
      }
    },
  );
});
