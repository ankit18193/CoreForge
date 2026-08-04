export class StackTraceFormatter {
  public static format(stack?: string): string {
    if (!stack) {
      return '';
    }

    const lines = stack.split('\n');
    const cleanedLines = lines.filter((line) => {
      return (
        !line.includes('node:internal') &&
        !line.includes('node_modules') &&
        !line.includes('node:async_hooks')
      );
    });

    const maskedLines = cleanedLines.map((line) => this.maskSensitive(line));
    return maskedLines.join('\n');
  }

  private static maskSensitive(line: string): string {
    return line.replace(
      /(password|token|authorization|secret)(["'\s:=]+)([^"'\s),&]+)/gi,
      '$1$2******',
    );
  }
}
