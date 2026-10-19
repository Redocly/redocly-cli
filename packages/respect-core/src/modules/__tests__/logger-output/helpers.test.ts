import { logger, type Totals } from '@redocly/openapi-core';

import type { VerboseLog } from '../../../types.js';
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
} from '../../logger-output/helpers.js';

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
      const mockLogger = vi.spyOn(logger, 'output').mockImplementation(() => {});
      printWorkflowSeparator({ fileName: 'file', workflowName: 'workflow', logger });
      expect(mockLogger).toHaveBeenCalledWith(expect.stringMatching('Running workflow'));
    });

    it('should print a separator without a workflow name', () => {
      const mockLogger = vi.spyOn(logger, 'output').mockImplementation(() => {});
      printWorkflowSeparator({ fileName: 'file', workflowName: undefined, logger });
      expect(mockLogger).toHaveBeenCalledWith(expect.stringMatching('Running workflow'));
    });
  });

  describe('printRequiredWorkflowSeparator', () => {
    it('should print a separator', () => {
      const mockLogger = vi.spyOn(logger, 'output').mockImplementation(() => {});
      printRequiredWorkflowSeparator('parentWorkflowId', logger);
      expect(mockLogger).toHaveBeenCalledWith(expect.stringMatching('Running required'));
    });
  });

  describe('printChildWorkflowSeparator', () => {
    it('should print a separator', () => {
      const mockLogger = vi.spyOn(logger, 'output').mockImplementation(() => {});
      printChildWorkflowSeparator('parentStepId', logger);
      expect(mockLogger).toHaveBeenCalledWith(expect.stringMatching('Running child'));
    });
  });

  describe('printActionsSeparator', () => {
    it('should print a separator', () => {
      const mockLogger = vi.spyOn(logger, 'output').mockImplementation(() => {});
      printActionsSeparator({
        stepId: 'parentStepId',
        actionName: 'actionName',
        kind: 'success',
        logger,
      });
      expect(mockLogger).toHaveBeenCalledWith(expect.stringMatching('Running success action'));
    });
  });

  describe('printWorkflowSeparatorLine', () => {
    it('should print a separator line', () => {
      const mockLogger = vi.spyOn(logger, 'printSeparator').mockImplementation(() => {});
      printWorkflowSeparatorLine(logger);
      expect(mockLogger).toHaveBeenCalledWith(expect.stringMatching('\u2500'));
    });
  });

  describe('printStepSeparatorLine', () => {
    it('should print a separator line', () => {
      const mockLogger = vi.spyOn(logger, 'printNewLine').mockImplementation(() => {});
      printStepSeparatorLine(logger);
      expect(mockLogger).toHaveBeenCalled();
    });
  });

  describe('printConfigLintTotals', () => {
    it('should print the number of errors', () => {
      const mockLogger = vi.spyOn(logger, 'error').mockImplementation(() => {});
      printConfigLintTotals({ errors: 1, warnings: 0, ignored: 0 } as Totals, logger);
      expect(mockLogger).toHaveBeenCalledWith(
        expect.stringMatching('❌  Your config has 1 error.')
      );
    });

    it('should print the number of warnings', () => {
      const mockLogger = vi.spyOn(logger, 'error').mockImplementation(() => {});
      printConfigLintTotals({ errors: 0, warnings: 1, ignored: 0 } as Totals, logger);
      expect(mockLogger).toHaveBeenCalledWith(
        expect.stringMatching('⚠️  Your config has 1 warning.')
      );
    });
  });

  describe('printStepDetails', () => {
    it('should print step details', () => {
      const mockLogger = vi.spyOn(logger, 'output').mockImplementation(() => {});
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
            passed: true,
            message: 'message',
            severity: 'error',
          },
        ],
        verboseLogs,
        verboseResponseLogs,
        logger,
      });
      expect(mockLogger).toHaveBeenCalledWith(expect.stringMatching('testNameToDisplay'));
    });
  });
});
