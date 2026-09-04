// Every action reports through this interface. The CLI passes its own
// logger; library callers pass what they need.
export interface Logger {
  log(line: string): void;
  warn(line: string): void;
  error(line: string): void;
}

export const silentLogger: Logger = {
  log() {},
  warn() {},
  error() {},
};

export interface CollectingLogger extends Logger {
  lines: string[];
  warnings: string[];
  errors: string[];
}

export function collectingLogger(): CollectingLogger {
  const lines: string[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];
  return {
    lines,
    warnings,
    errors,
    log: (line) => void lines.push(line),
    warn: (line) => void warnings.push(line),
    error: (line) => void errors.push(line),
  };
}
