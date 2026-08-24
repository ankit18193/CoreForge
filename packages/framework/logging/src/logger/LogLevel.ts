import { LogLevel } from '../types/loggingTypes';

export const LOG_LEVEL_SEVERITY: Readonly<Record<LogLevel, number>> = Object.freeze({
  TRACE: 10,
  DEBUG: 20,
  INFO: 30,
  WARN: 40,
  ERROR: 50,
  FATAL: 60,
});

export class LogLevelUtil {
  public static readonly ALL_LEVELS: readonly LogLevel[] = Object.freeze([
    'TRACE',
    'DEBUG',
    'INFO',
    'WARN',
    'ERROR',
    'FATAL',
  ]);

  public static isLogLevelEnabled(configured: LogLevel, requested: LogLevel): boolean {
    const configuredSeverity = LOG_LEVEL_SEVERITY[configured] ?? LOG_LEVEL_SEVERITY.INFO;
    const requestedSeverity = LOG_LEVEL_SEVERITY[requested] ?? LOG_LEVEL_SEVERITY.INFO;
    return requestedSeverity >= configuredSeverity;
  }

  public static normalize(level?: string): LogLevel {
    if (!level || typeof level !== 'string') {
      return 'INFO';
    }
    const upper = level.trim().toUpperCase() as LogLevel;
    if (this.ALL_LEVELS.includes(upper)) {
      return upper;
    }
    return 'INFO';
  }
}
