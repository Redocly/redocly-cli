// Every action reports through this interface. `log`, `warn`, and `error`
// carry progress and diagnostics; `output` carries report payloads. The CLI
// sends the first three to stderr and `output` to stdout.
export interface Logger {
  log(line: string): void;
  warn(line: string): void;
  error(line: string): void;
  output(line: string): void;
}

export const silentLogger: Logger = {
  log() {},
  warn() {},
  error() {},
  output() {},
};

export interface CollectingLogger extends Logger {
  lines: string[];
  warnings: string[];
  errors: string[];
  outputs: string[];
}

export function collectingLogger(): CollectingLogger {
  const lines: string[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];
  const outputs: string[] = [];
  return {
    lines,
    warnings,
    errors,
    outputs,
    log: (line) => void lines.push(line),
    warn: (line) => void warnings.push(line),
    error: (line) => void errors.push(line),
    output: (line) => void outputs.push(line),
  };
}
