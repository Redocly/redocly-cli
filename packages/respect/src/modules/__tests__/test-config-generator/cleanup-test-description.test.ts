import type { TestDescription } from '../../../types';

import { cleanupTestDescription } from '../../test-config-generator';

describe('cleanupTestDescription', () => {
  it('should cleanup sensitive information from a test config', () => {
    const testDescription = {
      workflows: [
        {
          workflowId: 'some-workflow-id',
          parameters: [
            {
              'some-default-key': 'some-default-value',
            },
          ],
          steps: [
            {
              stepId: 'some-step-id',
              parameters: [
                {
                  name: 'some-parameter-name',
                  value: 'some-parameter-value',
                },
              ],
              successCriteria: {},
            },
          ],
        },
      ],
      arazzo: 'some-workflow-spec',
      sourceDescriptions: 'some-source-descriptions',
      'x-serverUrl': 'some-server-url',
    } as unknown as TestDescription;

    expect(cleanupTestDescription(testDescription)).toEqual({
      workflows: [
        {
          workflowId: 'some-workflow-id',
          steps: [
            {
              stepId: 'some-step-id',
              parameters: [
                {
                  name: 'some-parameter-name',
                },
              ],
              successCriteria: {},
            },
          ],
        },
      ],
      arazzo: 'some-workflow-spec',
      sourceDescriptions: 'some-source-descriptions',
    });
  });
});
