import { ErrorClassification } from '../types/exceptionTypes';

export class ErrorClassifier {
  public static classify(error: unknown): ErrorClassification {
    try {
      if (typeof error !== 'object' || error === null) {
        return {
          category: 'INTERNAL',
          code: 'CF-INTERNAL-ERROR',
          status: 500,
        };
      }

      const candidate = error as Record<string, unknown>;
      const code = typeof candidate.code === 'string' ? candidate.code : '';
      const name = typeof candidate.name === 'string' ? candidate.name : '';

      // 1. Check known CoreForge codes or names
      if (
        code.startsWith('CF-PARAMETER-') ||
        code.includes('VALIDATION') ||
        name.includes('Validation') ||
        name.includes('ParameterBinding')
      ) {
        return {
          category: 'VALIDATION',
          code: code || 'CF-VALIDATION-ERROR',
          status: 400,
        };
      }

      if (
        code.includes('AUTHENTICATION') ||
        code.includes('UNAUTHORIZED') ||
        name.includes('Authentication') ||
        name.includes('Unauthorized')
      ) {
        return {
          category: 'AUTHENTICATION',
          code: code || 'CF-AUTHENTICATION-ERROR',
          status: 401,
        };
      }

      if (
        code.startsWith('CF-EXECUTION-GUARD') ||
        code.includes('AUTHORIZATION') ||
        code.includes('FORBIDDEN') ||
        name.includes('GuardRejected') ||
        name.includes('Forbidden')
      ) {
        return {
          category: 'AUTHORIZATION',
          code: code || 'CF-AUTHORIZATION-ERROR',
          status: 403,
        };
      }

      if (
        code.startsWith('CF-DI-') ||
        code.includes('DEPENDENCY') ||
        name.includes('Dependency') ||
        name.includes('Provider') ||
        name.includes('Scope')
      ) {
        return {
          category: 'DEPENDENCY',
          code: code || 'CF-DEPENDENCY-ERROR',
          status: 500,
        };
      }

      if (code.includes('TIMEOUT') || name.includes('Timeout')) {
        return {
          category: 'TIMEOUT',
          code: code || 'CF-TIMEOUT-ERROR',
          status: 504,
        };
      }

      if (code.includes('CANCEL') || name.includes('Cancel') || name.includes('Abort')) {
        return {
          category: 'CANCELLATION',
          code: code || 'CF-CANCELLATION-ERROR',
          status: 499,
        };
      }

      if (
        code.includes('CONFLICT') ||
        code.includes('DUPLICATE') ||
        name.includes('Conflict') ||
        name.includes('Duplicate')
      ) {
        return {
          category: 'CONFLICT',
          code: code || 'CF-CONFLICT-ERROR',
          status: 409,
        };
      }

      if (
        code.startsWith('CF-RESPONSE-') ||
        code.includes('SERIALIZ') ||
        name.includes('Serialization') ||
        name.includes('CircularResponse')
      ) {
        return {
          category: 'SERIALIZATION',
          code: code || 'CF-SERIALIZATION-ERROR',
          status: 500,
        };
      }

      if (
        code.startsWith('CF-EXECUTION-') ||
        name.includes('Execution') ||
        name.includes('Invocation')
      ) {
        return {
          category: 'EXECUTION',
          code: code || 'CF-EXECUTION-ERROR',
          status: 500,
        };
      }

      if (code.includes('NOT_FOUND') || code.includes('NOT-FOUND') || name.includes('NotFound')) {
        return {
          category: 'NOT_FOUND',
          code: code || 'CF-NOT-FOUND-ERROR',
          status: 404,
        };
      }

      // Default for generic Error instances
      if (error instanceof Error) {
        return {
          category: 'INTERNAL',
          code: code || 'CF-INTERNAL-ERROR',
          status: 500,
        };
      }

      return {
        category: 'INTERNAL',
        code: 'CF-INTERNAL-ERROR',
        status: 500,
      };
    } catch {
      return {
        category: 'INTERNAL',
        code: 'CF-INTERNAL-ERROR',
        status: 500,
      };
    }
  }
}
