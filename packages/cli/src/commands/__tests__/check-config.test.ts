import {
  formatProblems,
  lintConfig,
  loadConfig,
  type Config,
  type Exact,
  type Totals,
} from '@redocly/openapi-core';
import { red, yellow } from 'colorette';

import type { CommandArgv } from '../../types.js';
import { loadAndCheckConfig, printConfigLintTotals } from '../check-config.js';

vi.mock('colorette');
vi.mock('@redocly/openapi-core', async () => {
  const actual = await vi.importActual('@redocly/openapi-core');
  return { ...actual, loadConfig: vi.fn(), lintConfig: vi.fn(), formatProblems: vi.fn() };
});

beforeEach(() => {
  vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
});

describe('loadAndCheckConfig', () => {
  it('should print config problems in the check-config format regardless of --format', async () => {
    const config = { document: { parsed: {} } } as Config;
    vi.mocked(loadConfig).mockResolvedValue(config);
    vi.mocked(lintConfig).mockResolvedValue([]);

    const result = await loadAndCheckConfig(
      { 'lint-config': 'warn', format: 'json' } as Exact<CommandArgv>,
      '2.0.0'
    );

    expect(result).toBe(config);
    expect(formatProblems).toHaveBeenCalledWith([], {
      maxProblems: undefined,
      totals: { errors: 0, warnings: 0, ignored: 0 },
      version: '2.0.0',
      command: 'check-config',
    });
  });
});

describe('printConfigLintTotals', () => {
  const totalProblemsMock: Totals = {
    errors: 1,
    warnings: 0,
    ignored: 0,
  };

  const redColoretteMocks = vi.mocked(red);
  const yellowColoretteMocks = vi.mocked(yellow);

  beforeEach(() => {
    yellowColoretteMocks.mockImplementation((text) => text as string);
    redColoretteMocks.mockImplementation((text) => text as string);
  });

  it('should print errors if such exist', () => {
    printConfigLintTotals(totalProblemsMock);
    expect(process.stderr.write).toHaveBeenCalledWith('❌ Your config has 1 error.\n');
    expect(redColoretteMocks).toHaveBeenCalledWith('❌ Your config has 1 error.\n');
  });

  it('should print warning if no error', () => {
    printConfigLintTotals({ ...totalProblemsMock, errors: 0, warnings: 2 });
    expect(process.stderr.write).toHaveBeenCalledWith('⚠️ Your config has 2 warnings.\n');
    expect(yellowColoretteMocks).toHaveBeenCalledWith('⚠️ Your config has 2 warnings.\n');
  });

  it('should print nothing if no error and no warnings', () => {
    const result = printConfigLintTotals({ ...totalProblemsMock, errors: 0 });
    expect(result).toBeUndefined();
    expect(process.stderr.write).toHaveBeenCalledTimes(0);
    expect(yellowColoretteMocks).toHaveBeenCalledTimes(0);
    expect(redColoretteMocks).toHaveBeenCalledTimes(0);
  });
});
