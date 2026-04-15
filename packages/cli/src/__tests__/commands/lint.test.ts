import {
  lint,
  getTotals,
  formatProblems,
  logger,
  type Totals,
  type NormalizedProblem,
  loadConfig,
} from '@redocly/openapi-core';
import { blue } from 'colorette';
import { resolve } from 'node:path';
import { performance } from 'perf_hooks';
import { type MockInstance } from 'vitest';
import { type Arguments } from 'yargs';

import { handleLint, type LintArgv } from '../../commands/lint.js';
import { exitWithError } from '../../utils/error.js';
import {
  getFallbackApisOrExit,
  getExecutionTime,
  printUnusedWarnings,
  handleError,
  loadConfigAndHandleErrors,
  checkIfRulesetExist,
} from '../../utils/miscellaneous.js';
import { commandWrapper } from '../../wrapper.js';
import { configFixture } from '../fixtures/config.js';

const argvMock = {
  apis: ['openapi.yaml'],
  'lint-config': 'off',
  format: 'codeframe',
} as Arguments<LintArgv>;

describe('handleLint', () => {
  let processExitMock: MockInstance;
  let exitCb: any;

  beforeEach(() => {
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    processExitMock = vi.spyOn(process, 'exit').mockImplementation(vi.fn() as any);
    vi.spyOn(process, 'once').mockImplementation((_e, cb) => {
      exitCb = cb;
      return process.on(_e, cb);
    });

    vi.mock('perf_hooks');
    vi.spyOn(performance, 'now').mockImplementation(() => 42);

    vi.mock('@redocly/openapi-core', async () => {
      const actual = await vi.importActual('@redocly/openapi-core');
      return {
        ...actual,
        lint: vi.fn(async (): Promise<NormalizedProblem[]> => []),
        getTotals: vi.fn(() => ({ errors: 0, warnings: 0, ignored: 0 }) as Totals),
        doesYamlFileExist: vi.fn((path) => path === 'redocly.yaml'),
        logger: {
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
          output: vi.fn(),
        },
        formatProblems: vi.fn(),
      };
    });

    vi.mock('../../utils/miscellaneous.js');
    vi.mock('../../utils/error.js');
    vi.mocked(loadConfigAndHandleErrors).mockResolvedValue(configFixture);
    vi.mocked(getFallbackApisOrExit).mockImplementation(
      async (entrypoints) => entrypoints?.map((path: string) => ({ path })) ?? []
    );

    vi.mock('../../utils/package.js', () => ({
      version: '2.0.0',
    }));
  });

  describe('loadConfig and getEntrypoints stage', () => {
    it('should fail if config file does not exist', async () => {
      await commandWrapper(handleLint)({ ...argvMock, config: 'config.yaml' });
      expect(exitWithError).toHaveBeenCalledWith(
        'Please provide a valid path to the configuration file.'
      );
    });

    it('should call loadConfigAndHandleErrors and getFallbackApisOrExit', async () => {
      await commandWrapper(handleLint)(argvMock);
      expect(loadConfigAndHandleErrors).toHaveBeenCalledWith(
        {
          apis: ['openapi.yaml'],
          format: 'codeframe',
          'lint-config': 'off',
        },
        '2.0.0'
      );
      expect(getFallbackApisOrExit).toHaveBeenCalled();
    });

    it('should call loadConfig with args if such exist', async () => {
      await commandWrapper(handleLint)({
        ...argvMock,
        config: 'redocly.yaml',
        extends: ['some/path'],
      });
      expect(loadConfigAndHandleErrors).toHaveBeenCalledWith(
        {
          apis: ['openapi.yaml'],
          config: 'redocly.yaml',
          extends: ['some/path'],
          format: 'codeframe',
          'lint-config': 'off',
        },
        '2.0.0'
      );
    });

    it('should call forAlias when `generate-ignore-file` argv is set', async () => {
      await commandWrapper(handleLint)({ ...argvMock, 'generate-ignore-file': true });
      expect(configFixture.forAlias).toHaveBeenCalledWith(undefined);
    });

    it('should check if ruleset exist', async () => {
      await commandWrapper(handleLint)(argvMock);
      expect(checkIfRulesetExist).toHaveBeenCalledTimes(1);
    });

    it('should fail if apis not provided', async () => {
      await commandWrapper(handleLint)({ ...argvMock, apis: [] });
      expect(getFallbackApisOrExit).toHaveBeenCalledTimes(1);
      expect(exitWithError).toHaveBeenCalledWith('No APIs were provided.');
    });
  });

  describe('loop through entrypoints and lint stage', () => {
    it('should call getMergedConfig and lint', async () => {
      await commandWrapper(handleLint)(argvMock);
      expect(performance.now).toHaveBeenCalled();
      expect(configFixture.forAlias).toHaveBeenCalledTimes(1);
      expect(lint).toHaveBeenCalled();
    });

    it('should call skipRules,skipPreprocessors and addIgnore with argv', async () => {
      vi.mocked(lint).mockResolvedValueOnce(['problem'] as any);
      await commandWrapper(handleLint)({
        ...argvMock,
        'skip-preprocessor': ['preprocessor'],
        'skip-rule': ['rule'],
        'generate-ignore-file': true,
      });
      expect(configFixture.skipRules).toHaveBeenCalledWith(['rule']);
      expect(configFixture.skipPreprocessors).toHaveBeenCalledWith(['preprocessor']);
    });

    it('should update only the linted file entries and preserve ignore entries for other files', async () => {
      const barAbsRef = resolve('ignore-bar.yaml');
      const fooAbsRef = resolve('ignore-foo.yaml');

      configFixture.ignore = {
        [barAbsRef]: {
          'no-empty-servers': new Set(['#/servers']),
          'operation-summary': new Set(['#/paths/~1items/get/summary']),
        },
        [fooAbsRef]: {
          'no-empty-servers': new Set(['#/servers']),
        },
      };

      vi.mocked(configFixture.clearIgnoreForRef).mockImplementation((ref: string) => {
        const absRef = resolve(ref);
        delete configFixture.ignore[absRef];
      });

      vi.mocked(configFixture.addIgnore).mockImplementation((problem: any) => {
        const loc = problem.location[0];
        if (loc.pointer === undefined) return;
        const fileIgnore = (configFixture.ignore[loc.source.absoluteRef] =
          configFixture.ignore[loc.source.absoluteRef] || {});
        const ruleIgnore = (fileIgnore[problem.ruleId] = fileIgnore[problem.ruleId] || new Set());
        ruleIgnore.add(loc.pointer);
      });

      vi.mocked(lint).mockResolvedValueOnce([
        {
          ruleId: 'no-empty-servers',
          severity: 1,
          message: 'Servers must not be empty',
          location: [{ source: { absoluteRef: barAbsRef }, pointer: '#/servers' }],
          suggest: [],
          ignored: false,
        } as any,
      ]);

      await commandWrapper(handleLint)({
        ...argvMock,
        apis: ['ignore-bar.yaml'],
        'generate-ignore-file': true,
      });

      expect(configFixture.ignore[fooAbsRef]).toEqual({
        'no-empty-servers': new Set(['#/servers']),
      });

      expect(configFixture.ignore[barAbsRef]).toEqual({
        'no-empty-servers': new Set(['#/servers']),
      });

      expect(configFixture.saveIgnore).toHaveBeenCalled();

      configFixture.ignore = {};
    });

    it('should call formatProblems and getExecutionTime with argv', async () => {
      vi.mocked(lint).mockResolvedValueOnce(['problem'] as any);
      await commandWrapper(handleLint)({ ...argvMock, 'max-problems': 2, format: 'stylish' });
      expect(getTotals).toHaveBeenCalledWith(['problem']);
      expect(formatProblems).toHaveBeenCalledWith(['problem'], {
        format: 'stylish',
        maxProblems: 2,
        totals: { errors: 0, warnings: 0, ignored: 0 },
        version: '2.0.0',
        command: 'lint',
      });
      expect(getExecutionTime).toHaveBeenCalledWith(42);
    });

    it('should aggregate problems from multiple APIs into a single formatProblems call', async () => {
      vi.mocked(lint)
        .mockResolvedValueOnce(['problem-a'] as any)
        .mockResolvedValueOnce(['problem-b'] as any);
      await commandWrapper(handleLint)({
        ...argvMock,
        apis: ['a.yaml', 'b.yaml'],
        format: 'checkstyle',
      });
      expect(formatProblems).toHaveBeenCalledTimes(1);
      expect(formatProblems).toHaveBeenCalledWith(
        ['problem-a', 'problem-b'],
        expect.objectContaining({ format: 'checkstyle' })
      );
    });

    it('should catch error in handleError if something fails', async () => {
      vi.mocked(lint).mockRejectedValueOnce('error');
      await commandWrapper(handleLint)(argvMock);
      expect(handleError).toHaveBeenCalledWith('error', 'openapi.yaml');
    });
  });

  describe('errors and warning handle after lint stage', () => {
    it('should call printLintTotals and printLintTotals', async () => {
      await commandWrapper(handleLint)(argvMock);
      expect(printUnusedWarnings).toHaveBeenCalled();
    });

    it('should call exit with 0 if no errors', async () => {
      vi.mocked(loadConfigAndHandleErrors).mockImplementation(async () => {
        return configFixture;
      });
      await commandWrapper(handleLint)(argvMock);
      await exitCb?.();
      expect(processExitMock).toHaveBeenCalledWith(0);
    });

    it('should exit with 1 if total errors > 0', async () => {
      vi.mocked(getTotals).mockReturnValueOnce({ errors: 1 } as Totals);
      await commandWrapper(handleLint)(argvMock);
      await exitCb?.();
      expect(processExitMock).toHaveBeenCalledWith(1);
    });

    it('should suggest recommended fallback if there is no config', async () => {
      vi.mocked(loadConfigAndHandleErrors).mockImplementation(async () => {
        return await loadConfig({});
      });
      await commandWrapper(handleLint)(argvMock);
      expect(logger.info).toHaveBeenCalledWith(
        `No configurations were provided -- using built in ${blue(
          'recommended'
        )} configuration by default.\n\n`
      );
    });

    it('should not suggest recommended fallback if --extends is provided', async () => {
      vi.mocked(loadConfigAndHandleErrors).mockImplementation(async () => {
        return await loadConfig({});
      });
      await commandWrapper(handleLint)({ ...argvMock, extends: ['some/path'] });
      expect(logger.info).not.toHaveBeenCalledWith(
        `No configurations were provided -- using built in ${blue(
          'recommended'
        )} configuration by default.\n\n`
      );
    });
  });
});
