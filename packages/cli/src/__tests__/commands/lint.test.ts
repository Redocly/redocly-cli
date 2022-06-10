import { handleLint, LintOptions } from '../../commands/lint';
import {
  loadConfig,
  getMergedConfig,
  lint,
  getTotals,
  formatProblems,
} from '@redocly/openapi-core';
import {
  getFallbackEntryPointsOrExit,
  relativeFilePath,
  getExecutionTime,
  printUnusedWarnings,
  handleError,
} from '../../utils';
import { ConfigFixture } from '../fixtures/config';
import { performance } from 'perf_hooks';

jest.mock('@redocly/openapi-core');
jest.mock('../../utils');
jest.mock('perf_hooks');

const argvMock: LintOptions = {
  entrypoints: ['openapi.yaml'],
  'lint-config': 'off',
  format: 'codeframe',
};

const versionMock = '1.0.0';

describe('handleLint', () => {
  let processExitMock: jest.SpyInstance;
  let exitCb: any;
  const getMergedConfigMock = getMergedConfig as jest.Mock<any, any>;

  beforeEach(() => {
    jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
    (performance.now as jest.Mock<any,any>).mockImplementation(() => 42);
    processExitMock = jest.spyOn(process, 'exit').mockImplementation();
    jest.spyOn(process, 'once').mockImplementation((_e, cb) => {
      exitCb = cb;
      return process.on(_e, cb);
    });
    getMergedConfigMock.mockReturnValue(ConfigFixture);
  });

  describe('loadConfig and getEnrtypoints stage', () => {
    it('shoul call loadConfig and getFallbackEntryPointsOrExit', async () => {
      await handleLint(argvMock, versionMock);
      expect(loadConfig).toHaveBeenCalledWith(undefined, undefined, undefined);
      expect(getFallbackEntryPointsOrExit).toHaveBeenCalledWith(['openapi.yaml'], ConfigFixture);
    });

    it('should call loadConfig with args if such exist', async () => {
      await handleLint(
        { ...argvMock, config: '/path/redocly.yaml', extends: ['some/path'] },
        versionMock,
      );
      expect(loadConfig).toHaveBeenCalledWith('/path/redocly.yaml', ['some/path'], undefined);
    });

    it('should call mergedConfig with clear ignore if `generate-ignore-file` argv', async () => {
      await handleLint({ ...argvMock, 'generate-ignore-file': true }, versionMock);
      expect(getMergedConfigMock).toHaveBeenCalledWith(
        { ...ConfigFixture, lint: { ...ConfigFixture.lint, ignore: {} } },
        undefined,
      );
    });
  });

  describe('loop through entrypints and lint stage', () => {
    it('should call getMergedConfig and lint ', async () => {
      await handleLint(argvMock, versionMock);
      expect(performance.now).toHaveBeenCalled();
      expect(getMergedConfigMock).toHaveBeenCalledWith(ConfigFixture, undefined);
      expect(lint).toHaveBeenCalled();
      expect(relativeFilePath).toHaveBeenCalledTimes(2);
    });

    it('should call skipRules,skipPreprocessors and addIgnore with argv', async () => {
      (lint as jest.Mock<any, any>).mockResolvedValueOnce(['problem']);
      await handleLint(
        {
          ...argvMock,
          'skip-preprocessor': ['preprocessor'],
          'skip-rule': ['rule'],
          'generate-ignore-file': true,
        },
        versionMock,
      );
      expect(ConfigFixture.lint.skipRules).toHaveBeenCalledWith(['rule']);
      expect(ConfigFixture.lint.skipPreprocessors).toHaveBeenCalledWith(['preprocessor']);
      expect(ConfigFixture.lint.addIgnore).toHaveBeenCalledWith('problem');
    });

    it('should call formatProblems and getExecutionTime with argv', async () => {
      (lint as jest.Mock<any, any>).mockResolvedValueOnce(['problem']);
      await handleLint({ ...argvMock, 'max-problems': 2, format: 'stylish' }, versionMock);
      expect(getTotals).toHaveBeenCalledWith(['problem']);
      expect(formatProblems).toHaveBeenCalledWith(['problem'], {
        format: 'stylish',
        maxProblems: 2,
        totals: { errors: 0 },
        version: versionMock,
      });
      expect(getExecutionTime).toHaveBeenCalledWith(42);
    });

    it('should catch error in handleError if something fails', async () => {
      (lint as jest.Mock<any, any>).mockRejectedValueOnce('error');
      await handleLint(argvMock, versionMock);
      expect(handleError).toHaveBeenCalledWith('error', '');
    });
  });

  describe('erros and warning handle after lint stage', () => {
    it('should call printLintTotals and printLintTotals', async () => {
      await handleLint(argvMock, versionMock);
      expect(printUnusedWarnings).toHaveBeenCalledWith(ConfigFixture.lint);
    });

    it('should call exit with 0 if no errors', async () => {
      await handleLint(argvMock, versionMock);
      exitCb?.();
      expect(processExitMock).toHaveBeenCalledWith(0);
    });

    it('should exit with 1 if tootals error > 0', async () => {
      (getTotals as jest.Mock<any, any>).mockReturnValueOnce({ errors: 1 });
      await handleLint(argvMock, versionMock);
      exitCb?.();
      expect(processExitMock).toHaveBeenCalledWith(1);
    });
  });
});
