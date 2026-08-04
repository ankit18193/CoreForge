import * as assert from 'node:assert';
import { test } from 'node:test';

import { ConfigurationError, CoreForgeError, ValidationError } from '@coreforge/errors';

import { ExceptionCategory } from '../classifier/ExceptionCategory';
import { ExceptionClassifier } from '../classifier/ExceptionClassifier';
import { ExceptionContext } from '../context/ExceptionContext';
import { FilterPipeline } from '../filters/FilterPipeline';
import { ExceptionPipeline } from '../handler/ExceptionPipeline';
import { StackTraceFormatter } from '../internal/StackTraceFormatter';
import { ExceptionMapper } from '../mapper/ExceptionMapper';
import { ExceptionReporter } from '../reporters/ExceptionReporter';
import { LoggerReporter } from '../reporters/LoggerReporter';
import { ReporterPipeline } from '../reporters/ReporterPipeline';

test('Global Error & Exception Pipeline', async (t) => {
  await t.test('Classification - Known framework errors classify correctly', () => {
    const classifier = new ExceptionClassifier();
    const valErr = new ValidationError('Invalid request');
    const configErr = new ConfigurationError('Invalid host');

    assert.strictEqual(classifier.classify(valErr), ExceptionCategory.VALIDATION);
    assert.strictEqual(classifier.classify(configErr), ExceptionCategory.CONFIGURATION);
  });

  await t.test('Unknown Errors - Unknown JS errors become ExceptionCategory.UNKNOWN', () => {
    const classifier = new ExceptionClassifier();
    const rawErr = new TypeError('Cannot read property undefined');
    assert.strictEqual(classifier.classify(rawErr), ExceptionCategory.UNKNOWN);
  });

  await t.test('Cause Preservation - Nested exceptions preserve cause, stack, metadata', () => {
    const mapper = new ExceptionMapper();
    const originalCause = new TypeError('database timeout');
    const originalError = new Error('Database connection failed');
    Object.defineProperty(originalError, 'cause', { value: originalCause });

    const normalized = mapper.map(originalError);
    assert.strictEqual(normalized.code, 'CF-UNKNOWN_ERROR');
    assert.strictEqual(normalized.message, 'Database connection failed');
    assert.strictEqual((normalized as { cause?: unknown }).cause, originalCause);
    assert.strictEqual(normalized.stack, originalError.stack);
  });

  await t.test('Reporter Order - Multiple reporters execute sequentially', async () => {
    const executionOrder: string[] = [];
    const r1: ExceptionReporter = {
      name: 'R1',
      report() {
        executionOrder.push('R1');
      },
    };
    const r2: ExceptionReporter = {
      name: 'R2',
      report() {
        executionOrder.push('R2');
      },
    };

    const reporterPipeline = new ReporterPipeline();
    reporterPipeline.addReporter(r1);
    reporterPipeline.addReporter(r2);

    const error = new CoreForgeError('Pipeline test');
    const context = new ExceptionContext({});
    const runOrder = await reporterPipeline.execute(error, context);

    assert.deepStrictEqual(runOrder, ['R1', 'R2']);
    assert.deepStrictEqual(executionOrder, ['R1', 'R2']);
  });

  await t.test(
    'Reporter Failure - One failing reporter must not stop remaining reporters',
    async () => {
      const executionOrder: string[] = [];
      const r1: ExceptionReporter = {
        name: 'R1',
        report() {
          throw new Error('R1 crashed');
        },
      };
      const r2: ExceptionReporter = {
        name: 'R2',
        report() {
          executionOrder.push('R2');
        },
      };

      const reporterPipeline = new ReporterPipeline();
      reporterPipeline.addReporter(r1);
      reporterPipeline.addReporter(r2);

      const error = new CoreForgeError('Resiliency test');
      const context = new ExceptionContext({});
      const runOrder = await reporterPipeline.execute(error, context);

      assert.deepStrictEqual(runOrder, ['R2']);
      assert.deepStrictEqual(executionOrder, ['R2']);
    },
  );

  await t.test('Filter Pipeline - Filtered exceptions never reach reporters', async () => {
    const reportedErrors: CoreForgeError[] = [];
    const reporter: ExceptionReporter = {
      name: 'MockReporter',
      report(error: CoreForgeError) {
        reportedErrors.push(error);
      },
    };

    const filterPipeline = new FilterPipeline();
    filterPipeline.addFilter({
      name: 'IgnoreValidation',
      shouldHandle(error: CoreForgeError) {
        return error.code !== 'CF-2001';
      },
    });

    const reporterPipeline = new ReporterPipeline();
    reporterPipeline.addReporter(reporter);

    const pipeline = new ExceptionPipeline({
      filterPipeline,
      reporterPipeline,
    });

    const valErr = new ValidationError('Ignored error');
    const configErr = new ConfigurationError('Handled error');

    const resVal = await pipeline.run(valErr);
    const resConfig = await pipeline.run(configErr);

    assert.strictEqual(resVal.filtered, true);
    assert.strictEqual(resConfig.filtered, false);
    assert.strictEqual(reportedErrors.length, 1);
    assert.strictEqual(reportedErrors[0].code, 'CF-1001');
  });

  await t.test('Logger Reporter - LoggerReporter receives normalized exception', async () => {
    const errorLogs: Array<{ msg: string; ctx: unknown }> = [];
    const mockLogger = {
      debug() {},
      info() {},
      warn() {},
      error(msg: string, _err: Error | undefined, ctx: unknown) {
        errorLogs.push({ msg, ctx });
      },
      fatal() {},
    };

    const loggerReporter = new LoggerReporter(mockLogger);
    const context = new ExceptionContext({ requestId: 'req-456' });
    const error = new CoreForgeError('Log test', 'CF-1001');

    loggerReporter.report(error, context);

    assert.strictEqual(errorLogs.length, 1);
    assert.ok(errorLogs[0].msg.includes('[Exception] [Code: CF-1001] Log test'));
    assert.strictEqual((errorLogs[0].ctx as { requestId?: string })?.requestId, 'req-456');
  });

  await t.test('Custom Rules - Custom classifier rules override defaults', () => {
    const classifier = new ExceptionClassifier();
    classifier.registerRule({
      category: ExceptionCategory.CONFIGURATION,
      match: (err) => err.message.includes('force-config'),
    });

    const err = new Error('force-config error');
    assert.strictEqual(classifier.classify(err), ExceptionCategory.CONFIGURATION);
  });

  await t.test('Stack Formatter - Sensitive values are masked', () => {
    const rawStack =
      'Error: test\n    at login (token=super_secret_token)\n    at db (password="my-pass")\n    at auth (authorization=Bearer 123)\n    at app (secret: "my-key")';
    const formatted = StackTraceFormatter.format(rawStack);

    assert.ok(formatted.includes('token=******'));
    assert.ok(formatted.includes('password="******"'));
    assert.ok(formatted.includes('authorization=******'));
    assert.ok(formatted.includes('secret: "******"'));
  });

  await t.test('Context - ExceptionContext is deeply immutable', () => {
    const context = new ExceptionContext({
      requestId: 'req-1',
      metadata: { items: [1, 2, 3] },
    });

    assert.throws(() => {
      (context as unknown as Record<string, string>).requestId = 'new-id';
    }, TypeError);

    assert.throws(() => {
      (context.metadata as unknown as Record<string, string>).items = 'new-items';
    }, TypeError);
  });

  await t.test(
    'Execution Metrics & Exception Result - Processing metrics are captured',
    async () => {
      const pipeline = new ExceptionPipeline();
      const error = new Error('Timing validation');
      const result = await pipeline.run(error);

      assert.strictEqual(result.filtered, false);
      assert.strictEqual(result.category, ExceptionCategory.UNKNOWN);
      assert.ok(typeof result.processingTime === 'number');
      assert.strictEqual(result.normalizedError.message, 'Timing validation');
    },
  );
});
