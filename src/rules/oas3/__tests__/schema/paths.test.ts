import { outdent } from 'outdent';
import { validateDoc } from './utils';

describe('OpenAPI Schema', () => {
  it('should not report if Path object is valid ', async () => {
    const source = outdent`
      openapi: 3.0.2
      info:
        title: Test
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
    ).toMatchInlineSnapshot(`Array []`);
  });

  it('should not report if Path object is empty ', async () => {
    const source = outdent`
      openapi: 3.0.2
      info:
        title: Test
        version: '1.0'

      servers:
        - url: http://google.com

      paths:
    `;

    expect(
      await validateDoc(source, {
        schema: 'error',
      }),
    ).toMatchInlineSnapshot(`Array []`);
  });

  it('should report if Path object is not present ', async () => {
    const source = outdent`
      openapi: 3.0.2
      info:
        title: Test
        version: '1.0'

      servers:
        - url: http://google.com
    `;

    expect(
      await validateDoc(source, {
        schema: 'error',
      }),
    ).toMatchInlineSnapshot(`
      Array [
        Object {
          "location": "#/",
          "message": "The field 'paths' must be present on this level.",
        },
      ]
    `);
  });

  it('should not report if Path object is empty ', async () => {
    const source = outdent`
      openapi: 3.0.2
      info:
        title: Test
        version: '1.0'

      servers:
        - url: http://google.com

      paths:
    `;

    expect(
      await validateDoc(source, {
        schema: 'error',
      }),
    ).toMatchInlineSnapshot(`Array []`);
  });

  //Check: no error
  it('should report if the field name is not begin with a forward slash (/) ', async () => {
    const source = outdent`
      openapi: 3.0.2
      info:
        title: Test
        version: '1.0'

      servers:
        - url: http://google.com

      paths:
        'ping':
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

  //Check: no error
  it('should report if paths are considered identical and invalid', async () => {
    const source = outdent`
      openapi: 3.0.2
      info:
        title: Test
        version: '1.0'

      servers:
        - url: http://google.com

      paths:
        '/pets/{petId}':
          get:
            responses:
              '200':
                description: example description
        '/pets/{name}':
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

  it('should not report valid matching URLs', async () => {
    const source = outdent`
      openapi: 3.0.2
      info:
        title: Test
        version: '1.0'

      servers:
        - url: http://google.com

      paths:
        '/pets/{petId}':
          get:
            responses:
              '200':
                description: example description
        '/pets/mine':
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

  it('should not report in case of ambiguous matching ', async () => {
    const source = outdent`
      openapi: 3.0.2
      info:
        title: Test
        version: '1.0'

      servers:
        - url: http://google.com

      paths:
        '/{entity}/me':
          get:
            responses:
              '200':
                description: example description
        '/books/{id}':
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

  it('should not report if Path Item is empty ', async () => {
    const source = outdent`
      openapi: 3.0.2
      info:
        title: Test
        version: '1.0'

      servers:
        - url: http://google.com

      paths:
        '/ping':
    `;

    expect(
      await validateDoc(source, {
        schema: 'error',
      }),
    ).toMatchInlineSnapshot(`Array []`);
  });

  //Check: no error
  it('should report if reference to not existing Path Item Object ', async () => {
    const source = outdent`
      openapi: 3.0.2
      info:
        title: Test
        version: '1.0'

      servers:
        - url: http://google.com

      paths:
        '/ping':
          put:
            operationId: updatePet
            responses:
              '400':
                description: Invalid ID supplied
            requestBody:
              $ref: '#/components/requestBodies/Pet'
    `;
    expect(
      await validateDoc(source, {
        schema: 'error',
      }),
    ).toMatchInlineSnapshot(`Array []`);
  });

  it('should not report if summary field is valid', async () => {
    const source = outdent`
      openapi: 3.0.2
      info:
        title: Test
        version: '1.0'

      servers:
        - url: http://google.com

      paths:
        '/ping':
          summary: test
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

  it('should report if summary field is not string ', async () => {
    const source = outdent`
      openapi: 3.0.2
      info:
        title: Test
        version: '1.0'

      servers:
        - url: http://google.com

      paths:
        '/ping':
          summary:
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
          "location": "#/paths/~1ping/summary",
          "message": "Expected type 'string' but got 'null'",
        },
      ]
    `);
  });

  it('should not report if description field is valid', async () => {
    const source = outdent`
      openapi: 3.0.2
      info:
        title: Test
        version: '1.0'

      servers:
        - url: http://google.com

      paths:
        '/ping':
          description: test
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

  it('should report if description field is not string', async () => {
    const source = outdent`
      openapi: 3.0.2
      info:
        title: Test
        version: '1.0'

      servers:
        - url: http://google.com

      paths:
        '/ping':
          description:
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
          "location": "#/paths/~1ping/description",
          "message": "Expected type 'string' but got 'null'",
        },
      ]
    `);
  });

  it('should not report of a valid GET operation object', async () => {
    const source = outdent`
      openapi: 3.0.2
      info:
        title: Test
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
    ).toMatchInlineSnapshot(`Array []`);
  });

  it('should not report of a valid PUT operation object', async () => {
    const source = outdent`
      openapi: 3.0.2
      info:
        title: Test
        version: '1.0'

      servers:
        - url: http://google.com

      paths:
        '/ping':
          put:
            tags:
              - pet
            summary: Update an existing pet
            description: ''
            operationId: updatePet
            responses:
              '400':
                description: Invalid ID supplied
    `;

    expect(
      await validateDoc(source, {
        schema: 'error',
      }),
    ).toMatchInlineSnapshot(`Array []`);
  });

  it('should not report of a valid Post operation object', async () => {
    const source = outdent`
      openapi: 3.0.2
      info:
        title: Test
        version: '1.0'

      servers:
        - url: http://google.com

      paths:
        '/ping':
          post:
            tags:
              - pet
            summary: uploads an image
            description: ''
            operationId: uploadFile
            parameters:
              - name: petId
                in: path
                description: ID of pet to update
                required: true
                schema:
                  type: integer
                  format: int64
            responses:
              '200':
                description: successful operation
    `;

    expect(
      await validateDoc(source, {
        schema: 'error',
      }),
    ).toMatchInlineSnapshot(`Array []`);
  });

  it('should not report of a valid delete operation object', async () => {
    const source = outdent`
      openapi: 3.0.2
      info:
        title: Test
        version: '1.0'

      servers:
        - url: http://google.com

      paths:
        '/ping':
          delete:
            tags:
              - store
            summary: Delete purchase order by ID
            description: >-
              For valid response try integer IDs with value < 1000. Anything above
              1000 or nonintegers will generate API errors
            operationId: deleteOrder
            parameters:
              - name: orderId
                in: path
                description: ID of the order that needs to be deleted
                required: true
                schema:
                  type: string
                  minimum: 1
            responses:
              '400':
                description: Invalid ID supplied
    `;

    expect(
      await validateDoc(source, {
        schema: 'error',
      }),
    ).toMatchInlineSnapshot(`Array []`);
  });

  it('should not report of a valid delete operation object', async () => {
    const source = outdent`
      openapi: 3.0.2
      info:
        title: Test
        version: '1.0'

      servers:
        - url: http://google.com

      paths:
        '/ping':
          delete:
            tags:
              - store
            summary: Delete purchase order by ID
            description: >-
              For valid response try integer IDs with value < 1000. Anything above
              1000 or nonintegers will generate API errors
            operationId: deleteOrder
            parameters:
              - name: orderId
                in: path
                description: ID of the order that needs to be deleted
                required: true
                schema:
                  type: string
                  minimum: 1
            responses:
              '400':
                description: Invalid ID supplied
    `;

    expect(
      await validateDoc(source, {
        schema: 'error',
      }),
    ).toMatchInlineSnapshot(`Array []`);
  });

  it('should not report of a valid Parameter Object', async () => {
    const source = outdent`
      openapi: 3.0.2
      info:
        title: Test
        version: '1.0'

      servers:
        - url: http://google.com

      paths:
        /pet:
          parameters:
            - name: Accept-Language
              in: header
              description: "test"
              example: en-US
              required: false
              schema:
                type: string
                default: en-AU
          post:
            tags:
              - pet
            summary: Add a new pet to the store
            description: Add new pet to the store inventory.
            operationId: addPet
            responses:
              '405':
                description: Invalid input
    `;

    expect(
      await validateDoc(source, {
        schema: 'error',
      }),
    ).toMatchInlineSnapshot(`Array []`);
  });
});
