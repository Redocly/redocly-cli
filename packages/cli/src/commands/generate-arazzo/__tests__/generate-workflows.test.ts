import { logger } from '@redocly/openapi-core';
import type { TestDescription } from '@redocly/respect-core';

import { runProvider } from '../../../utils/ai/providers.js';
import { generateWorkflowsWithAi } from '../ai/generate-workflows.js';

vi.mock('../../../utils/ai/providers.js', async (importOriginal) => ({
  // oxlint-disable-next-line typescript/consistent-type-imports
  ...(await importOriginal<typeof import('../../../utils/ai/providers.js')>()),
  runProvider: vi.fn(),
}));

function baseline(): TestDescription {
  return {
    arazzo: '1.1.0',
    info: { title: 'Test API', version: '1.0.0' },
    sourceDescriptions: [{ name: 'test-api', type: 'openapi', url: 'openapi.yaml' }],
    workflows: [
      {
        workflowId: 'post-users-workflow',
        steps: [
          {
            stepId: 'post-users-step',
            operationId: '$sourceDescriptions.test-api.createUser',
            successCriteria: [{ condition: '$statusCode == 201' }],
          },
        ],
      },
      {
        workflowId: 'get-users-{id}-workflow',
        steps: [
          {
            stepId: 'get-users-step',
            operationId: '$sourceDescriptions.test-api.getUser',
            successCriteria: [{ condition: '$statusCode == 200' }],
          },
        ],
      },
    ] as TestDescription['workflows'],
  };
}

const redesignedWorkflows = `workflows:
  - workflowId: user-lifecycle
    summary: Create a user, then read it
    description: Creates a user and verifies it can be fetched back.
    steps:
      - stepId: create-user
        operationId: $sourceDescriptions.test-api.createUser
        outputs:
          id: $response.body#/id
        successCriteria:
          - condition: $statusCode == 201
      - stepId: get-user
        operationId: $sourceDescriptions.test-api.getUser
        successCriteria:
          - condition: $statusCode == 200
`;

async function generateWorkflows(text: string, maxWorkflows = 10) {
  vi.mocked(runProvider).mockResolvedValueOnce({ text });
  return generateWorkflowsWithAi({
    provider: 'claude',
    baseline: baseline(),
    description: { openapi: '3.1.0', paths: {} },
    maxWorkflows,
  });
}

describe('generateWorkflowsWithAi', () => {
  beforeEach(() => {
    vi.mocked(runProvider).mockReset();
    vi.spyOn(logger, 'info').mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('accepts the redesigned workflows and keeps the baseline header fields', async () => {
    const result = await generateWorkflows(redesignedWorkflows);
    expect(result.workflows).toBe(1);
    expect(result.yaml).toContain('workflowId: user-lifecycle');
    expect(result.yaml).toContain('id: $response.body#/id');
    expect(result.yaml).toContain('arazzo: 1.1.0');
    expect(result.yaml).toContain('url: openapi.yaml');
    expect(vi.mocked(runProvider).mock.calls[0][1].system).toContain('at most 10 workflow(s)');
  });

  it('rejects an answer with more workflows than --max-workflows allows', async () => {
    const secondWorkflow = `  - workflowId: read-user
    summary: Read a user
    steps:
      - stepId: read-user-step
        operationId: $sourceDescriptions.test-api.getUser
        successCriteria:
          - condition: $statusCode == 200
`;
    await expect(generateWorkflows(redesignedWorkflows + secondWorkflow, 1)).rejects.toThrow(
      'the response contains 2 workflows, more than the --max-workflows limit of 1'
    );
  });

  it('drops description and example prose when the full description does not fit the prompt', async () => {
    vi.mocked(runProvider).mockResolvedValueOnce({ text: redesignedWorkflows });
    const result = await generateWorkflowsWithAi({
      provider: 'claude',
      baseline: baseline(),
      description: {
        openapi: '3.1.0',
        info: { title: 'Test API', version: '1.0.0', description: 'x'.repeat(400_001) },
        components: {
          schemas: {
            User: { type: 'object', properties: { description: { type: 'string' } } },
          },
        },
      },
      maxWorkflows: 10,
    });
    expect(result.workflows).toBe(1);
    const request = vi.mocked(runProvider).mock.calls[0][1];
    expect(request.user).not.toContain('xxxx');
    // A schema property named "description" is data, not prose, and survives.
    expect(request.user).toContain('description:');
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('without description and example fields')
    );
  });

  it('rejects a description too large to prompt with, without calling the provider', async () => {
    await expect(
      generateWorkflowsWithAi({
        provider: 'claude',
        baseline: baseline(),
        description: { padding: 'x'.repeat(400_001) },
        maxWorkflows: 10,
      })
    ).rejects.toThrow('the OpenAPI description is too large to send to the AI provider');
    expect(runProvider).not.toHaveBeenCalled();
    expect(logger.info).not.toHaveBeenCalledWith(
      expect.stringContaining('without description and example fields')
    );
  });

  it('strips Markdown code fences before parsing', async () => {
    const result = await generateWorkflows(`\`\`\`yaml\n${redesignedWorkflows}\n\`\`\``);
    expect(result.workflows).toBe(1);
  });

  it('keeps the baseline components when the answer omits them', async () => {
    vi.mocked(runProvider).mockResolvedValueOnce({ text: redesignedWorkflows });
    const baselineWithComponents = {
      ...baseline(),
      components: { inputs: { basicAuth: { type: 'object' } } },
    };
    const result = await generateWorkflowsWithAi({
      provider: 'claude',
      baseline: baselineWithComponents,
      description: {},
      maxWorkflows: 10,
    });
    expect(result.yaml).toContain('basicAuth');
  });

  it('rejects an answer that is not a workflows document', async () => {
    await expect(generateWorkflows('Sorry, I cannot help with that.')).rejects.toThrow(
      'the response is not a YAML document with a non-empty "workflows" list'
    );
  });

  it('rejects an answer that references an operation missing from the description', async () => {
    const hallucinated = redesignedWorkflows.replace(
      '$sourceDescriptions.test-api.getUser',
      '$sourceDescriptions.test-api.listUsers'
    );
    await expect(generateWorkflows(hallucinated)).rejects.toThrow(
      'references operation(s) missing from the OpenAPI description: $sourceDescriptions.test-api.listUsers'
    );
  });

  it('rejects an answer whose step transfers to an undefined workflow', async () => {
    const danglingWorkflow = redesignedWorkflows.replace(
      'operationId: $sourceDescriptions.test-api.getUser',
      'workflowId: cleanup-workflow'
    );
    await expect(generateWorkflows(danglingWorkflow)).rejects.toThrow(
      'references workflow(s) it does not define: cleanup-workflow'
    );
  });

  it('rejects an answer that fails validation with the spec ruleset', async () => {
    const duplicatedStepId = redesignedWorkflows.replace('stepId: get-user', 'stepId: create-user');
    await expect(generateWorkflows(duplicatedStepId)).rejects.toThrow('validation problem');
  });
});
