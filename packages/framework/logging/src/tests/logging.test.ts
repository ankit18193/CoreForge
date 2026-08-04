import * as assert from 'node:assert';
import { test } from 'node:test';

import { LogContext } from '../context/LogContext';
import { LogEntry } from '../entries/LogEntry';
import { FormatterError, InvalidLogLevelError } from '../errors/LoggingErrors';
import { LogFilter } from '../filters/LogFilter';
import { Formatter } from '../formatters/Formatter';
import { JsonFormatter } from '../formatters/JsonFormatter';
import { PrettyFormatter } from '../formatters/PrettyFormatter';
import { LogLevel } from '../levels/LogLevel';
import { LoggerBuilder } from '../logger/LoggerBuilder';
import { Writer } from '../writers/Writer';

test('Logging System', async (t) => {
  await t.test('should trigger all logging methods correctly', async () => {
    const entries: LogEntry[] = [];
    const mockWriter: Writer = {
      write(_formatted, entry) {
        entries.push(entry);
      },
    };

    const logger = new LoggerBuilder()
      .setFormatter(new JsonFormatter())
      .addWriter(mockWriter)
      .setMinLevel(LogLevel.TRACE)
      .build();

    logger.debug('debug message', { correlationId: 'abc' });
    logger.info('info message');
    logger.warn('warn message');
    logger.error('error message', new Error('err'));
    logger.fatal('fatal message', new Error('fatal_err'));

    assert.strictEqual(entries.length, 5);
    assert.strictEqual(entries[0].level, LogLevel.DEBUG);
    assert.strictEqual(entries[0].context?.correlationId, 'abc');
    assert.strictEqual(entries[1].level, LogLevel.INFO);
    assert.strictEqual(entries[2].level, LogLevel.WARN);
    assert.strictEqual(entries[3].level, LogLevel.ERROR);
    assert.ok(entries[3].metadata?.error);
    assert.strictEqual(entries[4].level, LogLevel.FATAL);
  });

  await t.test('should support multiple writers receiving the same log entry', async () => {
    const outputs1: string[] = [];
    const outputs2: string[] = [];

    const w1: Writer = {
      write(formatted) {
        outputs1.push(formatted);
      },
    };
    const w2: Writer = {
      write(formatted) {
        outputs2.push(formatted);
      },
    };

    const logger = new LoggerBuilder()
      .setFormatter(new PrettyFormatter())
      .addWriter(w1)
      .addWriter(w2)
      .build();

    logger.info('test multi-writer');

    assert.strictEqual(outputs1.length, 1);
    assert.strictEqual(outputs2.length, 1);
    assert.strictEqual(outputs1[0], outputs2[0]);
    assert.ok(outputs1[0].includes('test multi-writer'));
  });

  await t.test(
    'should execute filter pipeline sequentially and respect minimum level',
    async () => {
      const logs: LogEntry[] = [];
      const writer: Writer = {
        write(_formatted, entry) {
          logs.push(entry);
        },
      };

      const f1: LogFilter = {
        shouldLog(entry) {
          return entry.message.includes('allow');
        },
      };

      const logger = new LoggerBuilder()
        .setFormatter(new PrettyFormatter())
        .addWriter(writer)
        .addFilter(f1)
        .setMinLevel(LogLevel.INFO)
        .build();

      logger.debug('debug message allow');
      logger.info('info message block');
      logger.warn('warn message allow');

      assert.strictEqual(logs.length, 1);
      assert.strictEqual(logs[0].message, 'warn message allow');
    },
  );

  await t.test('should support contextual logger inheritance and metadata merging', async () => {
    const logs: LogEntry[] = [];
    const writer: Writer = {
      write(_formatted, entry) {
        logs.push(entry);
      },
    };

    const parent = new LoggerBuilder()
      .setFormatter(new PrettyFormatter())
      .addWriter(writer)
      .setContext(new LogContext({ service: 'gateway', environment: 'production' }))
      .build();

    const child = parent.child({ module: 'auth', userId: 'user-123' });

    child.info('user login');

    assert.strictEqual(logs.length, 1);
    const ctx = logs[0].context;
    assert.strictEqual(ctx?.service, 'gateway');
    assert.strictEqual(ctx?.environment, 'production');
    assert.strictEqual(ctx?.module, 'auth');
    assert.strictEqual(ctx?.userId, 'user-123');
  });

  await t.test('should assert LoggerBuilder validation rules', async () => {
    assert.throws(() => {
      new LoggerBuilder().addWriter({ write() {} }).build();
    });

    assert.throws(() => {
      new LoggerBuilder().setFormatter(new JsonFormatter()).build();
    });

    assert.throws(() => {
      new LoggerBuilder().setMinLevel(999 as unknown as LogLevel);
    }, InvalidLogLevelError);
  });

  await t.test('should handle asynchronous writers without blocking execution thread', async () => {
    let resolved = false;
    const asyncWriter: Writer = {
      async write() {
        return new Promise<void>((resolve) => {
          setTimeout(() => {
            resolved = true;
            resolve();
          }, 50);
        });
      },
    };

    const logger = new LoggerBuilder()
      .setFormatter(new JsonFormatter())
      .addWriter(asyncWriter)
      .build();

    logger.info('async call');
    assert.strictEqual(resolved, false);

    await new Promise((resolve) => setTimeout(resolve, 80));
    assert.strictEqual(resolved, true);
  });

  await t.test('should wrap formatter failures inside FormatterError', async () => {
    const badFormatter: Formatter = {
      format() {
        throw new Error('Formatting went wrong');
      },
    };

    const logger = new LoggerBuilder()
      .setFormatter(badFormatter)
      .addWriter({ write() {} })
      .build();

    assert.throws(() => {
      logger.info('trigger format');
    }, FormatterError);
  });

  await t.test('should enforce immutable context propagation', async () => {
    const logs: LogEntry[] = [];
    const writer: Writer = {
      write(_formatted, entry) {
        logs.push(entry);
      },
    };

    const logger = new LoggerBuilder()
      .setFormatter(new JsonFormatter())
      .addWriter(writer)
      .setContext(new LogContext({ service: 'api', extra: { count: 10 } }))
      .build();

    logger.info('immutable check');

    assert.strictEqual(logs.length, 1);
    const entry = logs[0];

    assert.throws(() => {
      (entry as unknown as Record<string, string>).message = 'mutated';
    }, TypeError);

    assert.throws(() => {
      (entry.context as unknown as Record<string, string>).service = 'mutated';
    }, TypeError);

    assert.throws(() => {
      (entry.context?.extra as unknown as Record<string, number>).count = 20;
    }, TypeError);
  });
});
