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
    vi.spyOn(logger, 'warn').mockImplementation(() => true);
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

  describe('two-pass mode for large descriptions', () => {
    // Structure small enough for the operation index, padded so the whole
    // description can never fit a single prompt.
    function bigDescription() {
      return {
        openapi: '3.1.0',
        info: { title: 'Test API', version: '1.0.0' },
        'x-padding': 'x'.repeat(400_001),
        paths: {
          '/users': {
            post: { operationId: 'createUser', summary: 'Create a user', tags: ['Users'] },
          },
          '/users/{userId}': {
            get: { operationId: 'getUser', summary: 'Get a user', tags: ['Users'] },
          },
        },
      };
    }

    const selectedScenarios = `scenarios:
  - workflowId: user-lifecycle
    summary: Create then read a user
    operations:
      - $sourceDescriptions.test-api.createUser
      - $sourceDescriptions.test-api.getUser
`;

    async function generateTwoPass(...responses: string[]) {
      for (const text of responses) {
        vi.mocked(runProvider).mockResolvedValueOnce({ text });
      }
      return generateWorkflowsWithAi({
        provider: 'claude',
        baseline: baseline(),
        description: bigDescription(),
        maxWorkflows: 10,
      });
    }

    it('selects scenarios from a compact index, then designs each workflow', async () => {
      const result = await generateTwoPass(selectedScenarios, redesignedWorkflows);

      expect(result.workflows).toBe(1);
      expect(result.yaml).toContain('workflowId: user-lifecycle');
      expect(result.yaml).toContain('arazzo: 1.1.0');
      expect(vi.mocked(runProvider)).toHaveBeenCalledTimes(2);

      const selectionRequest = vi.mocked(runProvider).mock.calls[0][1];
      expect(selectionRequest.user).toContain('# Operation index');
      expect(selectionRequest.user).toContain('POST /users — Create a user [Users]');
      expect(selectionRequest.user).not.toContain('xxxx');

      const designRequest = vi.mocked(runProvider).mock.calls[1][1];
      expect(designRequest.user).toContain('# Scenario');
      expect(designRequest.user).toContain('operationId: createUser');
      expect(designRequest.user).not.toContain('xxxx');
    });

    it('rejects a selection that references an operation missing from the index', async () => {
      const hallucinated = selectedScenarios.replace('getUser', 'listUsers');
      await expect(generateTwoPass(hallucinated)).rejects.toThrow(
        'references operation(s) missing from the OpenAPI description: $sourceDescriptions.test-api.listUsers'
      );
      expect(vi.mocked(runProvider)).toHaveBeenCalledTimes(1);
    });

    it('skips a scenario whose design is rejected and keeps the rest', async () => {
      const twoScenarios = `scenarios:
  - workflowId: create-user-flow
    operations:
      - $sourceDescriptions.test-api.createUser
  - workflowId: read-user-flow
    operations:
      - $sourceDescriptions.test-api.getUser
`;
      const readUserWorkflow = `workflows:
  - workflowId: anything-the-model-said
    summary: Read a user
    steps:
      - stepId: read-user
        operationId: $sourceDescriptions.test-api.getUser
        successCriteria:
          - condition: $statusCode == 200
`;
      const result = await generateTwoPass(twoScenarios, 'workflows: [invalid', readUserWorkflow);

      expect(result.workflows).toBe(1);
      // The scenario id from the selection pass overrides the model's id.
      expect(result.yaml).toContain('workflowId: read-user-flow');
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('create-user-flow — skipped')
      );
    });

    it('rejects when no scenario produces a usable workflow', async () => {
      await expect(generateTwoPass(selectedScenarios, 'Sorry, I cannot help.')).rejects.toThrow(
        'did not produce a usable workflow for any scenario'
      );
    });

    it('caps schema depth when a scenario slice does not fit the prompt', async () => {
      const scenario = `scenarios:
  - workflowId: create-user-flow
    operations:
      - $sourceDescriptions.test-api.createUser
`;
      const createUserWorkflow = `workflows:
  - workflowId: create-user-flow
    summary: Create a user
    steps:
      - stepId: create-user
        operationId: $sourceDescriptions.test-api.createUser
        successCriteria:
          - condition: $statusCode == 201
`;
      const deepSchema = {
        type: 'object',
        properties: {
          level1: {
            type: 'object',
            properties: {
              level2: {
                type: 'object',
                properties: {
                  level3: { type: 'object', 'x-padding': 'x'.repeat(400_001) },
                },
              },
            },
          },
        },
      };
      vi.mocked(runProvider).mockResolvedValueOnce({ text: scenario });
      vi.mocked(runProvider).mockResolvedValueOnce({ text: createUserWorkflow });

      const result = await generateWorkflowsWithAi({
        provider: 'claude',
        baseline: baseline(),
        description: {
          openapi: '3.1.0',
          'x-padding': 'x'.repeat(400_001),
          paths: {
            '/users': {
              post: {
                operationId: 'createUser',
                requestBody: { content: { 'application/json': { schema: deepSchema } } },
              },
            },
          },
        },
        maxWorkflows: 10,
      });

      expect(result.workflows).toBe(1);
      const designRequest = vi.mocked(runProvider).mock.calls[1][1];
      expect(designRequest.user).toContain('level1');
      expect(designRequest.user).not.toContain('xxxx');
    });
  });
});
