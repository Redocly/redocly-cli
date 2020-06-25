import { outdent } from 'outdent';
import { validateDoc } from './utils';

describe('OpenAPI Schema', () => {
  it('should not report on valid Server Object', async () => {
    const source = outdent`
      openapi: 3.0.2
      info:
        title: Example OpenAPI 3 definition. Valid.
        version: '1.0'

      servers:
        - url: https://server.com/v1
          description: Development server

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

  it('should report on empty server URL', async () => {
    const source = outdent`
      openapi: 3.0.2
      info:
        title: Example OpenAPI 3 definition. Valid.
        version: '1.0'

      servers:
        - url:

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
    ).toMatchInlineSnapshot(`
      Array [
        Object {
          "location": "#/servers/0/url",
          "message": "Expected type 'string' but got 'null'",
        },
      ]
    `);
  });

  it('should report on missing server URL', async () => {
    const source = outdent`
      openapi: 3.0.2
      info:
        title: Example OpenAPI 3 definition. Valid.
        version: '1.0'

      servers:
       - description: Development server

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
    ).toMatchInlineSnapshot(`
      Array [
        Object {
          "location": "#/servers/0",
          "message": "The field 'url' must be present on this level.",
        },
      ]
    `);
  });

  it('should report on empty description field', async () => {
    const source = outdent`
      openapi: 3.0.2
      info:
        title: Example OpenAPI 3 definition. Valid.
        version: '1.0'

      servers:
        - url: https://server.com/v1
          description: 

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
    ).toMatchInlineSnapshot(`
      Array [
        Object {
          "location": "#/servers/0/description",
          "message": "Expected type 'string' but got 'null'",
        },
      ]
    `);
  });

  it('should not report if description field is missing', async () => {
    const source = outdent`
      openapi: 3.0.2
      info:
        title: Example OpenAPI 3 definition. Valid.
        version: '1.0'

      servers:
        - url: https://example.com 

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

  it('should report if fields type in servers are not array', async () => {
    const source = outdent`
      openapi: 3.0.2
      info:
        title: Example OpenAPI 3 definition. Valid.
        version: '1.0'

      servers:
        description: Development server

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
    ).toMatchInlineSnapshot(`
      Array [
        Object {
          "location": "#/servers",
          "message": "Expected type 'Server_List (array)' but got 'object'",
        },
      ]
    `);
  });

  it('should not report on multiple servers', async () => {
    const source = outdent`
      openapi: 3.0.2
      info:
        title: Example OpenAPI 3 definition. Valid.
        version: '1.0'

      servers:
        - url: https://development.server.com/v1
          description: Development server
        - url: https://staging.server.com/v1
          description: Staging server
        - url: https://api.server.com/v1
          description: Production server

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

  // This will fail without error message
  // it('should report on not valid multiple servers', async () => {
  //   const source = outdent`
  //     openapi: 3.0.2
  //     info:
  //       title: Example OpenAPI 3 definition. Valid.
  //       version: '1.0'

  //     servers:
  //       - url: https://development.server.com/v1
  //         description: Development server
  //       - url: https://staging.server.com/v1
  //         description: Staging server
  //       url: https://api.server.com/v1
  //         description: Production server

  //     paths:
  //       '/ping':
  //         get:
  //           responses:
  //             '200':
  //               description: example description
  //   `;

  //   expect(
  //     await validateDoc(source, {
  //       schema: 'error',
  //     }),
  //   ).toMatchInlineSnapshot(`Array []`);
  // });

  it('should not report if variables are used for a server configuration', async () => {
    const source = outdent`
      openapi: 3.0.2
      info:
        title: Example OpenAPI 3 definition. Valid.
        version: '1.0'

      servers:
        - url: https://{username}.server.com:{port}/{basePath}
          variables:
            username:
              default: demo
            port:
              enum:
                - '8443'
                - '443'
              default: '8443'
            basePath:
              default: v2

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

  it('should report if array in enum is empty', async () => {
    const source = outdent`
      openapi: 3.0.2
      info:
        title: Example OpenAPI 3 definition. Valid.
        version: '1.0'

      servers:
        - url: https://{username}.server.com:{port}/{basePath}
          variables:
            username:
              default: demo
            port:
              enum:

              default: '8443'
            basePath:
              default: v2

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
    ).toMatchInlineSnapshot(`
      Array [
        Object {
          "location": "#/servers/0/variables/port/enum",
          "message": "Expected type 'array' but got 'null'",
        },
      ]
    `);
  });

  //Check: no error
  it('should report if some variable is not provided', async () => {
    const source = outdent`
      openapi: 3.0.2
      info:
        title: Example OpenAPI 3 definition. Valid.
        version: '1.0'

      servers:
        - url: https://{username}.server.com:{port}/{basePath}
          variables:
            username:
              default: demo
            port:
              enum:
                - '8443'
                - '443'
              default: '8443'

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

  // Check: no error
  it('should report if defaut value is not provided in variables', async () => {
    const source = outdent`
      openapi: 3.0.2
      info:
        title: Example OpenAPI 3 definition. Valid.
        version: '1.0'

      servers:
        - url: https://{username}.server.com:{port}/{basePath}
          variables:
            username:
            port:
              enum:
                - '8443'
                - '443'
              default: '8443'
            basePath:
              default: v2

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

  it('should report if defaut value in variables is empty', async () => {
    const source = outdent`
      openapi: 3.0.2
      info:
        title: Example OpenAPI 3 definition. Valid.
        version: '1.0'

      servers:
        - url: https://{username}.server.com:{port}/{basePath}
          variables:
            username:
              default:
            port:
              enum:
                - '8443'
                - '443'
              default: '8443'
            basePath:
              default: v2

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
    ).toMatchInlineSnapshot(`
      Array [
        Object {
          "location": "#/servers/0/variables/username/default",
          "message": "Expected type 'string' but got 'null'",
        },
      ]
    `);
  });

  //Check: No error
  it('should report if description in variable is empty', async () => {
    const source = outdent`
      openapi: 3.0.2
      info:
        title: Example OpenAPI 3 definition. Valid.
        version: '1.0'

      servers:
        - url: https://{username}.server.com:{port}/{basePath}
          variables:
            username:
              default: demo
              description: 
            port:
              enum:
                - '8443'
                - '443'
              default: '8443'
            basePath:
              default: v2

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

  it('should not report if servers property is not provided', async () => {
    const source = outdent`
        openapi: 3.0.2
        info:
          title: Example OpenAPI 3 definition. Valid.
          version: '1.0'
  
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

  it('should not report if servers property is an empty array', async () => {
    const source = outdent`
        openapi: 3.0.2
        info:
          title: Example OpenAPI 3 definition. Valid.
          version: '1.0'

        servers:
  
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

  it('should verify if the title of the API is required ', async () => {
    const source = outdent`
      openapi: 3.0.2
      info:
        version: '1.0'

      servers:
        - url: http://google.com

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
    ).toMatchInlineSnapshot(`
      Array [
        Object {
          "location": "#/info",
          "message": "The field 'title' must be present on this level.",
        },
      ]
    `);
  });

  it('should verify if the title of the API is not empty ', async () => {
    const source = outdent`
      openapi: 3.0.2
      info:
        title:
        version: '1.0'

      servers:
        - url: http://google.com

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
    ).toMatchInlineSnapshot(`
      Array [
        Object {
          "location": "#/info/title",
          "message": "Expected type 'string' but got 'null'",
        },
      ]
    `);
  });

  it('should verify if the description fied MAY be used for text representation.', async () => {
    const source = outdent`
      openapi: 3.0.2
      info:
        title: Example OpenAPI 3 definition.
        version: '1.0'
        description: 

      servers:
        - url: http://google.com

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
    ).toMatchInlineSnapshot(`
      Array [
        Object {
          "location": "#/info/description",
          "message": "Expected type 'string' but got 'null'",
        },
      ]
    `);
  });

  it('should verify if the termsOfService field MUST be in the format of a URL', async () => {
    const source = outdent`
      openapi: 3.0.2
      info:
        title: Example OpenAPI 3 definition. Valid.
        version: '1.0'
        termsOfService: 

      servers:
        - url: http://google.com

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
    ).toMatchInlineSnapshot(`
      Array [
        Object {
          "location": "#/info/termsOfService",
          "message": "Expected type 'string' but got 'null'",
        },
      ]
    `);
  });

  it('should verify if the Contact Object is valid', async () => {
    const source = outdent`
      openapi: 3.0.2
      info:
        title: Example OpenAPI 3 definition. Valid.
        version: '1.0'
        termsOfService: http://example.com/terms/
        contact:
          name: API Support
          url: http://www.example.com/support
          email: support@example.com

      servers:
        - url: http://google.com

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

  it('should verify if the Contact Object contains URL', async () => {
    const source = outdent`
      openapi: 3.0.2
      info:
        title: Example OpenAPI 3 definition. Valid.
        version: '1.0'
        termsOfService: http://example.com/terms/
        contact:
          url: 
          email: support@example.com

      servers:
        - url: http://google.com

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
    ).toMatchInlineSnapshot(`
      Array [
        Object {
          "location": "#/info/contact/url",
          "message": "Expected type 'string' but got 'null'",
        },
      ]
    `);
  });

  it('should verify if the Contact Object contains email', async () => {
    const source = outdent`
      openapi: 3.0.2
      info:
        title: Example OpenAPI 3 definition. Valid.
        version: '1.0'
        termsOfService: http://example.com/terms/
        contact:
          url: http://example.com/contact/
          email: 

      servers:
        - url: http://google.com

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
    ).toMatchInlineSnapshot(`
      Array [
        Object {
          "location": "#/info/contact/email",
          "message": "Expected type 'string' but got 'null'",
        },
      ]
    `);
  });

  it('should verify if the License Object present', async () => {
    const source = outdent`
      openapi: 3.0.2
      info:
        title: Example OpenAPI 3 definition. Valid.
        version: '1.0'
        license:
          name: Apache 2.0
          url: https://www.apache.org/licenses/LICENSE-2.0.html

      servers:
        - url: http://google.com

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

  it('should verify if the License Object contains field Name', async () => {
    const source = outdent`
      openapi: 3.0.2
      info:
        title: Example OpenAPI 3 definition. Valid.
        version: '1.0'
        license:
          url: https://www.apache.org/licenses/LICENSE-2.0.html

      servers:
        - url: http://google.com

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
    ).toMatchInlineSnapshot(`
      Array [
        Object {
          "location": "#/info/license",
          "message": "The field 'name' must be present on this level.",
        },
      ]
    `);
  });

  it('should verify if the URL field in the License Object should be string', async () => {
    const source = outdent`
      openapi: 3.0.2
      info:
        title: Example OpenAPI 3 definition. Valid.
        version: '1.0'
        license:
          name: Apache 2.0
          url:

      servers:
        - url: http://google.com

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
    ).toMatchInlineSnapshot(`
      Array [
        Object {
          "location": "#/info/license/url",
          "message": "Expected type 'string' but got 'null'",
        },
      ]
    `);
  });

  it('should verify if the URL field in the License Object is optional', async () => {
    const source = outdent`
      openapi: 3.0.2
      info:
        title: Example OpenAPI 3 definition. Valid.
        version: '1.0'
        license:
          name: Apache 2.0

      servers:
        - url: http://google.com

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

  it('should verify if the Version field is Required', async () => {
    const source = outdent`
      openapi: 3.0.2
      info:
        title: Example OpenAPI 3 definition.

      servers:
        - url: http://google.com

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
    ).toMatchInlineSnapshot(`
      Array [
        Object {
          "location": "#/info",
          "message": "The field 'version' must be present on this level.",
        },
      ]
    `);
  });

  it('should verify if the Version field should be string', async () => {
    const source = outdent`
      openapi: 3.0.2
      info:
        version: 
        title: Example OpenAPI 3 definition.

      servers:
        - url: http://google.com

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
    ).toMatchInlineSnapshot(`
      Array [
        Object {
          "location": "#/info/version",
          "message": "Expected type 'string' but got 'null'",
        },
      ]
    `);
  });
});
