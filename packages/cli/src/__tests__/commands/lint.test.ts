import { handleLint, LintOptions } from '../../commands/lint.js';
import {
  getMergedConfig,
  lint,
  getTotals,
  formatProblems,
  doesYamlFileExist,
  type Totals,
} from '@redocly/openapi-core';
import {
  getFallbackApisOrExit,
  getExecutionTime,
  printUnusedWarnings,
  handleError,
  exitWithError,
  loadConfigAndHandleErrors,
  checkIfRulesetExist,
} from '../../utils/miscellaneous.js';
import { configFixture } from '../fixtures/config.js';
import { performance } from 'perf_hooks';
import { commandWrapper } from '../../wrapper.js';
import { Arguments } from 'yargs';
import { blue } from 'colorette';
import { type MockInstance } from 'vitest';

const argvMock = {
  apis: ['openapi.yaml'],
  'lint-config': 'off',
  format: 'codeframe',
} as Arguments<LintOptions>;

describe('handleLint', () => {
  let processExitMock: MockInstance;
  let exitCb: any;
  const getMergedConfigMock = vi.mocked(getMergedConfig);

  beforeEach(() => {
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    processExitMock = vi.spyOn(process, 'exit').mockImplementation(vi.fn() as any);
    vi.spyOn(process, 'once').mockImplementation((_e, cb) => {
      exitCb = cb;
      return process.on(_e, cb);
    });

    vi.mock('perf_hooks');
    vi.spyOn(performance, 'now').mockImplementation(() => 42);

    vi.mock('@redocly/openapi-core');
    getMergedConfigMock.mockReturnValue(configFixture);
    vi.mocked(doesYamlFileExist).mockImplementation((path) => path === 'redocly.yaml');
    vi.mocked(getTotals).mockReturnValue({ errors: 0 } as Totals);

    vi.mock('../../utils/miscellaneous.js');
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
      expect(loadConfigAndHandleErrors).toHaveBeenCalledWith({
        configPath: undefined,
        customExtends: undefined,
        processRawConfig: undefined,
      });
      expect(getFallbackApisOrExit).toHaveBeenCalled();
    });

    it('should call loadConfig with args if such exist', async () => {
      await commandWrapper(handleLint)({
        ...argvMock,
        config: 'redocly.yaml',
        extends: ['some/path'],
      });
      expect(loadConfigAndHandleErrors).toHaveBeenCalledWith({
        configPath: 'redocly.yaml',
        customExtends: ['some/path'],
        processRawConfig: undefined,
      });
    });

    it('should call mergedConfig with clear ignore if `generate-ignore-file` argv', async () => {
      await commandWrapper(handleLint)({ ...argvMock, 'generate-ignore-file': true });
      expect(getMergedConfigMock).toHaveBeenCalled();
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
    it('should call getMergedConfig and lint ', async () => {
      await commandWrapper(handleLint)(argvMock);
      expect(performance.now).toHaveBeenCalled();
      expect(getMergedConfigMock).toHaveBeenCalled();
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
      expect(configFixture.styleguide.skipRules).toHaveBeenCalledWith(['rule']);
      expect(configFixture.styleguide.skipPreprocessors).toHaveBeenCalledWith(['preprocessor']);
    });

    it('should call formatProblems and getExecutionTime with argv', async () => {
      vi.mocked(lint).mockResolvedValueOnce(['problem'] as any);
      await commandWrapper(handleLint)({ ...argvMock, 'max-problems': 2, format: 'stylish' });
      expect(getTotals).toHaveBeenCalledWith(['problem']);
      expect(formatProblems).toHaveBeenCalledWith(['problem'], {
        format: 'stylish',
        maxProblems: 2,
        totals: { errors: 0 },
        version: '2.0.0',
      });
      expect(getExecutionTime).toHaveBeenCalledWith(42);
    });

    it('should catch error in handleError if something fails', async () => {
      vi.mocked(lint).mockRejectedValueOnce('error');
      await commandWrapper(handleLint)(argvMock);
      expect(handleError).toHaveBeenCalledWith('error', 'openapi.yaml');
    });
  });

  describe('erros and warning handle after lint stage', () => {
    it('should call printLintTotals and printLintTotals', async () => {
      await commandWrapper(handleLint)(argvMock);
      expect(printUnusedWarnings).toHaveBeenCalled();
    });

    it('should call exit with 0 if no errors', async () => {
      vi.mocked(loadConfigAndHandleErrors).mockImplementation(async () => {
        return { ...configFixture };
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

    it('should use recommended fallback if no config', async () => {
      vi.mocked(getMergedConfig).mockImplementation((): any => {
        return {
          styleguide: {
            recommendedFallback: true,
            rules: {},
            skipRules: vi.fn(),
            skipPreprocessors: vi.fn(),
          },
        };
      });
      await commandWrapper(handleLint)(argvMock);
      expect(process.stderr.write).toHaveBeenCalledWith(
        `No configurations were provided -- using built in ${blue(
          'recommended'
        )} configuration by default.\n\n`
      );
    });
  });
});
