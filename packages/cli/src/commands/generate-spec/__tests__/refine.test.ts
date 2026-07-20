import { logger } from '@redocly/openapi-core';

import { CliNotFoundError, runProvider } from '../ai/providers.js';
import { refineSpecWithAi } from '../ai/refine.js';
import type { GeneratedDocument } from '../generator.js';

vi.mock('../ai/providers.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../ai/providers.js')>()),
  runProvider: vi.fn(),
}));

function baseline(): GeneratedDocument {
  return {
    openapi: '3.2.0',
    info: { title: 'Test API', version: '1.0.0' },
    paths: {
      '/users': {
        get: {
          operationId: 'get-users',
          responses: {
            '200': {
              description: 'OK',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/User' } },
              },
            },
          },
        },
        post: {
          operationId: 'post-users',
          responses: { '201': { description: 'Created' } },
        },
      },
    },
    components: {
      schemas: {
        User: {
          type: 'object',
          properties: { id: { type: 'integer' }, name: { type: 'string' } },
          required: ['id', 'name'],
        },
      },
    },
  };
}

const refinedGetUsers = `paths:
  /users:
    get:
      operationId: listUsers
      summary: List users
      responses:
        '200':
          description: A list of users
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
components:
  schemas:
    User:
      type: object
      description: A user account
      properties:
        id:
          type: integer
        name:
          type: string
      required:
        - id
`;

const refinedPostUsers = `paths:
  /users:
    post:
      operationId: createUser
      summary: Create a user
      responses:
        '201':
          description: Created
`;

function mockResponses(...texts: string[]) {
  for (const text of texts) {
    vi.mocked(runProvider).mockResolvedValueOnce({ text });
  }
}

async function refine(document = baseline()) {
  return refineSpecWithAi({
    provider: 'claude',
    baseline: document,
    samplesByOperation: new Map(),
  });
}

describe('refineSpecWithAi', () => {
  beforeEach(() => {
    vi.mocked(runProvider).mockReset();
    vi.spyOn(logger, 'info').mockImplementation(() => true);
    vi.spyOn(logger, 'warn').mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('refines operations one by one and merges the results', async () => {
    mockResponses(refinedGetUsers, refinedPostUsers);
    const result = await refine();
    expect(vi.mocked(runProvider)).toHaveBeenCalledTimes(2);
    expect(result.refined).toBe(2);
    expect(result.total).toBe(2);
    expect(result.yaml).toContain('summary: List users');
    expect(result.yaml).toContain('operationId: createUser');
    expect(result.yaml).toContain('description: A user account');
  });

  it('sends each operation a focused prompt with only its referenced components', async () => {
    mockResponses(refinedGetUsers, refinedPostUsers);
    await refine();
    const [firstRequest, secondRequest] = vi
      .mocked(runProvider)
      .mock.calls.map(([, request]) => request);
    expect(firstRequest.user).toContain('Component schemas referenced by this operation');
    expect(firstRequest.user).toContain('User:');
    expect(secondRequest.user).not.toContain('Component schemas referenced by this operation');
    expect(secondRequest.user).toContain('Reserved component names');
  });

  it('lets later operations see components refined earlier', async () => {
    const document = baseline();
    document.paths['/users/{userId}'] = {
      get: {
        operationId: 'get-users-userId',
        parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          '200': {
            description: 'OK',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } },
          },
        },
      },
    };
    const refinedGetUser = `paths:
  /users/{userId}:
    get:
      operationId: getUser
      parameters:
        - name: userId
          in: path
          required: true
          schema:
            type: integer
      responses:
        '200':
          description: A user
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
`;
    mockResponses(refinedGetUsers, refinedPostUsers, refinedGetUser);
    const result = await refine(document);
    expect(result.refined).toBe(3);
    const thirdRequest = vi.mocked(runProvider).mock.calls[2][1];
    expect(thirdRequest.user).toContain('description: A user account');
  });

  it('refines operations in parallel when concurrency is greater than 1', async () => {
    const resolvers: ((result: { text: string }) => void)[] = [];
    vi.mocked(runProvider).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvers.push(resolve);
        })
    );
    const resultPromise = refineSpecWithAi({
      provider: 'claude',
      baseline: baseline(),
      samplesByOperation: new Map(),
      concurrency: 2,
    });
    await vi.waitFor(() => expect(resolvers).toHaveLength(2));
    resolvers[0]({ text: refinedGetUsers });
    resolvers[1]({ text: refinedPostUsers });
    const result = await resultPromise;
    expect(result.refined).toBe(2);
    expect(result.yaml).toContain('summary: List users');
    expect(result.yaml).toContain('operationId: createUser');
  });

  it('strips Markdown code fences before parsing', async () => {
    mockResponses(`\`\`\`yaml\n${refinedGetUsers}\n\`\`\``, refinedPostUsers);
    const result = await refine();
    expect(result.refined).toBe(2);
    expect(result.yaml).toContain('summary: List users');
  });

  it('keeps the baseline operation when the provider returns invalid YAML', async () => {
    mockResponses('paths: [invalid', refinedPostUsers);
    const result = await refine();
    expect(result.refined).toBe(1);
    expect(result.yaml).toContain('operationId: get-users');
    expect(result.yaml).toContain('operationId: createUser');
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('kept the baseline'));
  });

  it('keeps the baseline operation when the response misses the operation', async () => {
    mockResponses(refinedPostUsers, refinedPostUsers);
    const result = await refine();
    expect(result.refined).toBe(1);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('does not contain the GET operation')
    );
  });

  it('keeps the baseline operation when the operationId is dropped', async () => {
    mockResponses(refinedGetUsers.replace('      operationId: listUsers\n', ''), refinedPostUsers);
    const result = await refine();
    expect(result.refined).toBe(1);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('dropped the operationId'));
  });

  it('keeps the baseline operation when an observed status code is dropped', async () => {
    mockResponses(refinedGetUsers.replace("'200':", "'404':"), refinedPostUsers);
    const result = await refine();
    expect(result.refined).toBe(1);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('dropped observed response status(es): 200')
    );
  });

  it('keeps the baseline operation when the refined operation fails validation', async () => {
    mockResponses(
      refinedGetUsers.replace('description: A list of users', 'descriptio: A list of users'),
      refinedPostUsers
    );
    const result = await refine();
    expect(result.refined).toBe(1);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('validation problem'));
  });

  it('prunes components that are no longer referenced', async () => {
    const inlineGetUsers = `paths:
  /users:
    get:
      operationId: listUsers
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: object
`;
    mockResponses(inlineGetUsers, refinedPostUsers);
    const result = await refine();
    expect(result.refined).toBe(2);
    expect(result.document.components).toBeUndefined();
    expect(result.yaml).not.toContain('components:');
  });

  it('aborts refinement when the provider CLI is not installed', async () => {
    vi.mocked(runProvider).mockRejectedValue(
      new CliNotFoundError('Could not find the "claude" CLI on PATH. Is it installed?')
    );
    await expect(refine()).rejects.toThrow('Could not find the "claude" CLI');
    expect(vi.mocked(runProvider)).toHaveBeenCalledTimes(1);
  });

  it('rejects when no operation could be refined', async () => {
    vi.mocked(runProvider).mockResolvedValue({ text: 'Sorry, I cannot help with that.' });
    await expect(refine()).rejects.toThrow('did not produce a usable refinement for any operation');
  });
});
