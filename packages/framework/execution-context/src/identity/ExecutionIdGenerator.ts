import * as crypto from 'node:crypto';

import { ExecutionIdError } from '../errors/ExecutionContextErrors';

const EXECUTION_ID_REGEX = /^[0-9a-f]{32}$/;
const ALL_ZERO_EXECUTION_ID = '0'.repeat(32);

export class ExecutionIdGenerator {
  public static generate(): string {
    let id: string;
    do {
      id = crypto.randomBytes(16).toString('hex');
    } while (id === ALL_ZERO_EXECUTION_ID);
    return id;
  }

  public static validate(executionId: unknown): string {
    if (typeof executionId !== 'string') {
      throw new ExecutionIdError('Execution ID must be a 32-character hexadecimal string', {
        executionId,
      });
    }

    const lower = executionId.toLowerCase();
    if (!EXECUTION_ID_REGEX.test(lower)) {
      throw new ExecutionIdError(
        'Invalid Execution ID: must be exactly 32 lowercase hexadecimal characters',
        { executionId },
      );
    }

    if (lower === ALL_ZERO_EXECUTION_ID) {
      throw new ExecutionIdError('Invalid Execution ID: all-zero execution IDs are rejected', {
        executionId,
      });
    }

    return lower;
  }
}
