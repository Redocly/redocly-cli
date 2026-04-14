import { logger } from '@redocly/openapi-core';

import type { VerboseLog } from '../../../types.js';
import { displayChecks } from '../../logger-output/display-checks.js';

describe('displayChecks', () => {
  describe('FormData body with repeated keys (list)', () => {
    it('formats FormData with multiple values for the same key as JSON array in request body output', () => {
      const formData = new FormData();
      formData.append('name', 'dessert');
      formData.append('recommendedWith', 'tea');
      formData.append('recommendedWith', 'coffee');
      formData.append('recommendedWith', 'juice');

      const outputCalls: string[] = [];
      const mockOutput = vi.spyOn(logger, 'output').mockImplementation((chunk: string) => {
        outputCalls.push(chunk);
      });

      const verboseLogs: VerboseLog = {
        method: 'POST',
        path: '/menu',
        host: 'http://localhost',
        body: formData,
      };

      displayChecks({
        testNameToDisplay: 'POST /menu - step create-product',
        checks: [{ name: 'CheckName', passed: true, message: '', severity: 'error' }],
        verboseLogs,
        logger,
      });

      mockOutput.mockRestore();

      const fullOutput = outputCalls.join('');

      expect(fullOutput).toContain('tea');
      expect(fullOutput).toContain('coffee');
      expect(fullOutput).toContain('juice');
      expect(fullOutput).toContain('dessert');
    });

    it('formats FormData with single value per key without wrapping in array', () => {
      const formData = new FormData();
      formData.append('name', 'cake');
      formData.append('category', 'dessert');

      const outputCalls: string[] = [];
      const mockOutput = vi.spyOn(logger, 'output').mockImplementation((chunk: string) => {
        outputCalls.push(chunk);
      });

      const verboseLogs: VerboseLog = {
        method: 'POST',
        path: '/menu',
        host: 'http://localhost',
        body: formData,
      };

      displayChecks({
        testNameToDisplay: 'POST /menu',
        checks: [],
        verboseLogs,
        logger,
      });

      mockOutput.mockRestore();

      const fullOutput = outputCalls.join('');
      expect(fullOutput).toContain('cake');
      expect(fullOutput).toContain('dessert');
    });
  });
});
