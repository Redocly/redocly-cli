import { logger } from '@redocly/openapi-core';

import { runProvider } from '../ai/providers.js';
import { compareOperations, refineSpecWithAi, stripInventedOperations } from '../ai/refine.js';
import type { GeneratedDocument } from '../generator.js';

vi.mock('../ai/providers.js', () => ({
  runProvider: vi.fn(),
}));

const baseline: GeneratedDocument = {
  openapi: '3.1.0',
  info: { title: 'Test API', version: '1.0.0' },
  paths: {
    '/users': {
      get: { operationId: 'get-users', responses: { '200': { description: 'ok' } } },
      post: { operationId: 'post-users', responses: { '201': { description: 'created' } } },
    },
    '/users/{userId}': {
      get: { operationId: 'get-users-userId', responses: { '200': { description: 'ok' } } },
    },
  },
};

const refinedDocument = `openapi: 3.1.0
info:
  title: Test API
  version: 1.0.0
paths:
  /users:
    get:
      operationId: listUsers
      summary: List users
      responses:
        '200':
          description: A list of users
    post:
      operationId: createUser
      responses:
        '201':
          description: Created
  /users/{id}:
    get:
      operationId: getUser
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
      responses:
        '200':
          description: A user
`;

function mockProviderResponse(text: string) {
  vi.mocked(runProvider).mockResolvedValue({ text });
}

async function refine() {
  return refineSpecWithAi({ provider: 'claude', baseline, samples: [] });
}

describe('compareOperations', () => {
  it('matches operations regardless of path parameter names', () => {
    const refined = {
      paths: {
        '/users': { get: {}, post: {} },
        '/users/{id}': { get: {} },
      },
    };
    expect(compareOperations(baseline, refined)).toEqual({ missing: [], invented: [] });
  });

  it('reports baseline operations absent from the refined document', () => {
    const refined = { paths: { '/users': { get: {} } } };
    expect(compareOperations(baseline, refined).missing).toEqual([
      { path: '/users', method: 'post' },
      { path: '/users/{userId}', method: 'get' },
    ]);
  });

  it('reports operations the refined document invented', () => {
    const refined = {
      paths: {
        '/users': { get: {}, post: {}, delete: {} },
        '/users/{id}': { get: {} },
        '/admin': { get: {} },
      },
    };
    expect(compareOperations(baseline, refined).invented).toEqual([
      { path: '/users', method: 'delete' },
      { path: '/admin', method: 'get' },
    ]);
  });

  it('treats a non-object paths value as missing everything', () => {
    expect(compareOperations(baseline, { paths: null }).missing).toHaveLength(3);
  });
});

describe('stripInventedOperations', () => {
  it('removes invented operations and drops paths left without operations', () => {
    const refined = {
      paths: {
        '/users': { get: { operationId: 'listUsers' }, delete: {} },
        '/admin': { get: {}, parameters: [] },
      },
    };
    stripInventedOperations(refined, [
      { path: '/users', method: 'delete' },
      { path: '/admin', method: 'get' },
    ]);
    expect(refined.paths).toEqual({ '/users': { get: { operationId: 'listUsers' } } });
  });
});

describe('refineSpecWithAi', () => {
  it('accepts a complete, valid refined document', async () => {
    mockProviderResponse(refinedDocument);
    const result = await refine();
    expect(result.yaml).toContain('summary: List users');
  });

  it('strips Markdown code fences before parsing', async () => {
    mockProviderResponse(`\`\`\`yaml\n${refinedDocument}\`\`\``);
    const result = await refine();
    expect(result.yaml).toContain('summary: List users');
  });

  it('rejects a refined document that dropped baseline operations', async () => {
    mockProviderResponse(refinedDocument.replace(/ {4}post:[\s\S]*?description: Created\n/, ''));
    await expect(refine()).rejects.toThrow(
      'dropped 1 operation(s) observed in the traffic (the response may have been truncated): POST /users'
    );
  });

  it('removes invented operations from the refined document', async () => {
    const withInvented = `${refinedDocument}  /admin:
    get:
      operationId: adminPanel
      responses:
        '200':
          description: Admin panel
`;
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    mockProviderResponse(withInvented);
    const result = await refine();
    expect(result.yaml).not.toContain('/admin');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('GET /admin'));
  });

  it('rejects a refined document with structural validation errors', async () => {
    mockProviderResponse(refinedDocument.replace('description: Created', 'descriptio: Created'));
    await expect(refine()).rejects.toThrow(/validation problem/);
  });

  it('rejects unparseable YAML', async () => {
    mockProviderResponse('openapi: [3.1.0');
    await expect(refine()).rejects.toThrow('did not return valid YAML');
  });

  it('rejects output that is not an OpenAPI document', async () => {
    mockProviderResponse('Sorry, I cannot produce an OpenAPI description.');
    await expect(refine()).rejects.toThrow('not a valid OpenAPI document');
  });
});
