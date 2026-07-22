import { buildOperationPrompt } from '../ai/prompt.js';

describe('buildOperationPrompt', () => {
  it('renders the full prompt for an operation with components and samples', () => {
    const { system, user } = buildOperationPrompt({
      path: '/users/{userId}',
      method: 'get',
      operation: {
        operationId: 'get-users-userId',
        parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          '200': {
            description: 'OK',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } },
          },
        },
      },
      components: {
        User: { type: 'object', properties: { id: { type: 'integer' }, name: { type: 'string' } } },
      },
      reservedComponentNames: ['Order', 'Error'],
      samples: [
        {
          method: 'GET',
          path: '/users/42',
          query: 'expand=profile',
          status: 200,
          responseContentType: 'application/json',
          responseBody: '{"id":42,"name":"Jane"}',
        },
      ],
    });

    expect(system).toMatchSnapshot();
    expect(user).toMatchSnapshot();
  });
});
