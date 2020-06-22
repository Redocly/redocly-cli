import { outdent } from 'outdent';
import { validateDoc } from './utils';

describe('OpenAPI Schema', () => {
  it('should not report on valid servers', async () => {
    const source = outdent`
      openapi: 3.0.2
      info:
        title: Example OpenAPI 3 definition. Valid.
        version: '1.0'

      servers:
        - url: https://google.com

      paths:
        '/ping':
          get:
            responses:
              '200':
                description: example description
    `;

    expect(
      await validateDoc(source, {
        schema: 'error',
      }),
    ).toMatchInlineSnapshot(`Array []`);
  });
});
