import type { Totals } from '@redocly/openapi-core';
import type { VerboseLog } from '../../types';

// eslint-disable-next-line import-x/order
import { DefaultLogger } from '../../utils/logger/logger';

const logger = DefaultLogger.getInstance();

import {
  printWorkflowSeparatorLine,
  printWorkflowSeparator,
  printStepSeparatorLine,
  printConfigLintTotals,
  printRequiredWorkflowSeparator,
  printChildWorkflowSeparator,
  printActionsSeparator,
  indent,
  removeExtraIndentation,
  printStepDetails,
} from '../cli-outputs';

describe('cliOutputs', () => {
  describe('removeExtraIndentation', () => {
    it('should remove extra indentation', () => {
      const message = '  This is a message';
      const trimmedMessage = removeExtraIndentation(message);
      expect(trimmedMessage).toBe('This is a message');
    });

    it('should return an empty string', () => {
      const message = undefined;
      const trimmedMessage = removeExtraIndentation(message);
      expect(trimmedMessage).toBe('');
    });
  });

  describe('indent', () => {
    it('should indent a string', () => {
      const indentedString = indent('string', 2);
      // eslint-disable-next-line no-irregular-whitespace
      expect(indentedString).toMatchInlineSnapshot(`"  string"`);
    });
  });

  describe('printWorkflowSeparator', () => {
    it('should print a separator', () => {
      const mockLogger = jest.spyOn(logger, 'log').mockImplementation();
      printWorkflowSeparator('file', 'workflow');
      expect(mockLogger).toHaveBeenCalledWith(expect.stringMatching('Running workflow'));
      mockLogger.mockRestore();
    });

    it('should print a separator', () => {
      const mockLogger = jest.spyOn(logger, 'log').mockImplementation();
      printWorkflowSeparator('file', undefined);
      expect(mockLogger).toHaveBeenCalledWith(expect.stringMatching('Running workflow'));
      mockLogger.mockRestore();
    });
  });

  describe('printRequiredWorkflowSeparator', () => {
    it('should print a separator', () => {
      const mockLogger = jest.spyOn(logger, 'log').mockImplementation();
      printRequiredWorkflowSeparator('parentWorkflowId');
      expect(mockLogger).toHaveBeenCalledWith(expect.stringMatching('Running required'));
      mockLogger.mockRestore();
    });
  });

  describe('printChildWorkflowSeparator', () => {
    it('should print a separator', () => {
      const mockLogger = jest.spyOn(logger, 'log').mockImplementation();
      printChildWorkflowSeparator('parentStepId');
      expect(mockLogger).toHaveBeenCalledWith(expect.stringMatching('Running child'));
      mockLogger.mockRestore();
    });
  });

  describe('printActionsSeparator', () => {
    it('should print a separator', () => {
      const mockLogger = jest.spyOn(logger, 'log').mockImplementation();
      printActionsSeparator('parentStepId', 'actionName', 'success');
      expect(mockLogger).toHaveBeenCalledWith(expect.stringMatching('Running success action'));
    });
  });

  describe('printWorkflowSeparatorLine', () => {
    it('should print a separator line', () => {
      const mockLogger = jest.spyOn(logger, 'printSeparator').mockImplementation();
      printWorkflowSeparatorLine();
      expect(mockLogger).toHaveBeenCalledWith(expect.stringMatching('\u2500'));
      mockLogger.mockRestore();
    });
  });

  describe('printStepSeparatorLine', () => {
    it('should print a separator line', () => {
      const mockLogger = jest.spyOn(logger, 'printNewLine').mockImplementation();
      printStepSeparatorLine();
      expect(mockLogger).toHaveBeenCalled();
      mockLogger.mockRestore();
    });
  });

  describe('printConfigLintTotals', () => {
    it('should print the number of errors', () => {
      const mockLogger = jest.spyOn(logger, 'error').mockImplementation();
      printConfigLintTotals({ errors: 1, warnings: 0, ignored: 0 } as Totals);
      expect(mockLogger).toHaveBeenCalledWith(
        expect.stringMatching('❌  Your config has 1 one error.')
      );
      mockLogger.mockRestore();
    });

    it('should print the number of warnings', () => {
      const mockLogger = jest.spyOn(logger, 'error').mockImplementation();
      printConfigLintTotals({ errors: 0, warnings: 1, ignored: 0 } as Totals);
      expect(mockLogger).toHaveBeenCalledWith(
        expect.stringMatching('⚠️  Your config has 1 one warning.')
      );
      mockLogger.mockRestore();
    });
  });

  describe('printStepDetails', () => {
    it('should print step details', () => {
      const mockLogger = jest.spyOn(logger, 'log').mockImplementation();
      const verboseLogs = {
        method: 'GET',
        path: 'path',
        host: 'host',
      } as VerboseLog;
      const verboseResponseLogs = {
        method: 'GET',
        path: 'path',
        host: 'host',
      } as VerboseLog;
      printStepDetails({
        testNameToDisplay: 'testNameToDisplay',
        checks: [
          {
            name: 'CheckName',
            pass: true,
            message: 'message',
            severity: 'error',
          },
        ],
        verboseLogs,
        verboseResponseLogs,
      });
      expect(mockLogger).toHaveBeenCalledWith(expect.stringMatching('testNameToDisplay'));
      mockLogger.mockRestore();
    });
  });
});
