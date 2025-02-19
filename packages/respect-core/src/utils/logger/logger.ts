import { gray } from 'colorette';

const RESET_ESCAPE_CODE_IN_TERMINAL = '\x1B[0m';

export interface Logger {
  log(message: string): void;
  error(message: string): void;
  printNewLine(): void;
  printSeparator(separator: string): void;
}

export class DefaultLogger implements Logger {
  private static instance: DefaultLogger;

  private constructor() {}

  public static getInstance(): DefaultLogger {
    if (!DefaultLogger.instance) {
      DefaultLogger.instance = new DefaultLogger();
    }
    return DefaultLogger.instance;
  }

  error(message: string): void {
    process.stderr.write(`${message}\n`);
  }

  log(message: string): void {
    process.stdout.write(`${message}`);
  }

  printNewLine(): void {
    process.stdout.write(`${RESET_ESCAPE_CODE_IN_TERMINAL}\n`);
  }

  printSeparator(separator: string) {
    const windowWidth = process.stdout.columns || 80;
    const separatorLine = separator
      .repeat(Math.ceil(windowWidth / separator.length))
      .slice(0, windowWidth);

    process.stdout.write(gray(`${separatorLine}`));
  }
}
