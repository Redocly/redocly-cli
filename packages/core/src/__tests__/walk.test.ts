import outdent from 'outdent';
import path from 'node:path';
import { lintDocument } from '../lint.js';
import { parseYamlToDocument, replaceSourceWithRef } from '../../__tests__/utils.js';
import { BaseResolver, type Document } from '../resolve.js';
import { listOf } from '../types/index.js';
import { type Oas2RuleSet, type Oas3RuleSet } from '../oas-types.js';
import { createConfig } from '../config/index.js';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('walk order', () => {
  it('should run visitors', async () => {
    const visitors = {
      Root: {
        enter: vi.fn(),
        leave: vi.fn(),
      },
      Info: {
        enter: vi.fn(),
        leave: vi.fn(),
      },
      Contact: {
        enter: vi.fn(),
        leave: vi.fn(),
      },
      License: {
        enter: vi.fn(),
        leave: vi.fn(),
      },
    };

    const testRuleSet: Oas3RuleSet = {
      test: vi.fn(() => {
        return visitors;
      }),
    };

    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        info:
          contact: {}
          license: {}
      `,
      ''
    );

    await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        plugins: [
          {
            id: 'test',
            rules: {
              oas3: testRuleSet,
            },
          },
        ],
        rules: {
          'test/test': 'error',
        },
      }),
    });

    expect(testRuleSet.test).toBeCalledTimes(1);
    for (const fns of Object.values(visitors)) {
      expect(fns.enter).toBeCalled();
      expect(fns.leave).toBeCalled();
    }
  });

  it('should run legacy visitors', async () => {
    const visitors = {
      DefinitionRoot: {
        enter: vi.fn(),
        leave: vi.fn(),
      },
      PathMap: {
        enter: vi.fn(),
        leave: vi.fn(),
      },
      ServerVariableMap: {
        enter: vi.fn(),
        leave: vi.fn(),
      },
      MediaTypeMap: {
        enter: vi.fn(),
        leave: vi.fn(),
      },
      ExampleMap: {
        enter: vi.fn(),
        leave: vi.fn(),
      },
      HeaderMap: {
        enter: vi.fn(),
        leave: vi.fn(),
      },
    };

    const testRuleSet: Oas3RuleSet = {
      test: vi.fn(() => {
        return visitors;
      }),
    };

    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        servers:
        - url: http://{test}.url
          variables:
            test: test
        paths:
          /test-path:
            get:
              responses:
                200:
                  headers: {}
                  content:
                    application/json:
                      schema: {}
                      examples: {}
      `,
      ''
    );

    await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        plugins: [
          {
            id: 'test',
            rules: {
              oas3: testRuleSet,
            },
          },
        ],
        rules: {
          'test/test': 'error',
        },
      }),
    });

    expect(testRuleSet.test).toBeCalledTimes(1);
    for (const fns of Object.values(visitors)) {
      expect(fns.enter).toBeCalled();
      expect(fns.leave).toBeCalled();
    }
  });

  it('should run nested visitors correctly', async () => {
    const calls: string[] = [];

    const testRuleSet: Oas3RuleSet = {
      test: vi.fn(() => {
        return {
          Operation: {
            enter: vi.fn((op) => calls.push(`enter operation: ${op.operationId}`)),
            leave: vi.fn((op) => calls.push(`leave operation: ${op.operationId}`)),
            Parameter: {
              enter: vi.fn((param, _ctx, parents) =>
                calls.push(`enter operation ${parents.Operation.operationId} > param ${param.name}`)
              ),
              leave: vi.fn((param, _ctx, parents) =>
                calls.push(`leave operation ${parents.Operation.operationId} > param ${param.name}`)
              ),
            },
          },
          Parameter: {
            enter: vi.fn((param) => calls.push(`enter param ${param.name}`)),
            leave: vi.fn((param) => calls.push(`leave param ${param.name}`)),
          },
        };
      }),
    };

    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        info:
          contact: {}
          license: {}
        paths:
          /pet:
            parameters:
              - name: path-param
            get:
              operationId: get
              parameters:
                - name: get_a
                - name: get_b
            post:
              operationId: post
              parameters:
                - name: post_a

      `,
      ''
    );

    await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        plugins: [
          {
            id: 'test',
            rules: {
              oas3: testRuleSet,
            },
          },
        ],
        rules: {
          'test/test': 'error',
        },
      }),
    });

    expect(calls).toMatchInlineSnapshot(`
      [
        "enter param path-param",
        "leave param path-param",
        "enter operation: get",
        "enter operation get > param get_a",
        "enter param get_a",
        "leave param get_a",
        "leave operation get > param get_a",
        "enter operation get > param get_b",
        "enter param get_b",
        "leave param get_b",
        "leave operation get > param get_b",
        "leave operation: get",
        "enter operation: post",
        "enter operation post > param post_a",
        "enter param post_a",
        "leave param post_a",
        "leave operation post > param post_a",
        "leave operation: post",
      ]
    `);
  });

  it('should run nested visitors correctly oas2', async () => {
    const calls: string[] = [];

    const testRuleSet: Oas2RuleSet = {
      test: vi.fn(() => {
        return {
          Operation: {
            enter: vi.fn((op) => calls.push(`enter operation: ${op.operationId}`)),
            leave: vi.fn((op) => calls.push(`leave operation: ${op.operationId}`)),
            Parameter: {
              enter: vi.fn((param, _ctx, parents) =>
                calls.push(`enter operation ${parents.Operation.operationId} > param ${param.name}`)
              ),
              leave: vi.fn((param, _ctx, parents) =>
                calls.push(`leave operation ${parents.Operation.operationId} > param ${param.name}`)
              ),
            },
          },
          Parameter: {
            enter: vi.fn((param) => calls.push(`enter param ${param.name}`)),
            leave: vi.fn((param) => calls.push(`leave param ${param.name}`)),
          },
        };
      }),
    };

    const document = parseYamlToDocument(
      outdent`
        swagger: "2.0"
        info:
          contact: {}
          license: {}
        paths:
          /pet:
            parameters:
              - name: path-param
            get:
              operationId: get
              parameters:
                - name: get_a
                - name: get_b
            post:
              operationId: post
              parameters:
                - name: post_a

      `,
      ''
    );

    await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        plugins: [
          {
            id: 'test',
            rules: {
              oas2: testRuleSet,
            },
          },
        ],
        rules: {
          'test/test': 'error',
        },
      }),
    });

    expect(calls).toMatchInlineSnapshot(`
      [
        "enter param path-param",
        "leave param path-param",
        "enter operation: get",
        "enter operation get > param get_a",
        "enter param get_a",
        "leave param get_a",
        "leave operation get > param get_a",
        "enter operation get > param get_b",
        "enter param get_b",
        "leave param get_b",
        "leave operation get > param get_b",
        "leave operation: get",
        "enter operation: post",
        "enter operation post > param post_a",
        "enter param post_a",
        "leave param post_a",
        "leave operation post > param post_a",
        "leave operation: post",
      ]
    `);
  });

  it('should resolve refs', async () => {
    const calls: string[] = [];

    const testRuleSet: Oas3RuleSet = {
      test: vi.fn(() => {
        return {
          Operation: {
            enter: vi.fn((op) => calls.push(`enter operation: ${op.operationId}`)),
            leave: vi.fn((op) => calls.push(`leave operation: ${op.operationId}`)),
            Parameter: {
              enter: vi.fn((param, _ctx, parents) =>
                calls.push(`enter operation ${parents.Operation.operationId} > param ${param.name}`)
              ),
              leave: vi.fn((param, _ctx, parents) =>
                calls.push(`leave operation ${parents.Operation.operationId} > param ${param.name}`)
              ),
            },
          },
          Parameter: {
            enter: vi.fn((param) => calls.push(`enter param ${param.name}`)),
            leave: vi.fn((param) => calls.push(`leave param ${param.name}`)),
          },
        };
      }),
    };

    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        info:
          contact: {}
          license: {}
        paths:
          /pet:
            get:
              operationId: get
              parameters:
                - $ref: '#/components/parameters/shared_a'
                - name: get_b
            post:
              operationId: post
              parameters:
                - $ref: '#/components/parameters/shared_a'
        components:
          parameters:
            shared_a:
              name: shared-a
      `,
      ''
    );

    await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        plugins: [
          {
            id: 'test',
            rules: {
              oas3: testRuleSet,
            },
          },
        ],
        rules: {
          'test/test': 'error',
        },
      }),
    });

    expect(calls).toMatchInlineSnapshot(`
      [
        "enter operation: get",
        "enter operation get > param shared-a",
        "enter param shared-a",
        "leave param shared-a",
        "leave operation get > param shared-a",
        "enter operation get > param get_b",
        "enter param get_b",
        "leave param get_b",
        "leave operation get > param get_b",
        "leave operation: get",
        "enter operation: post",
        "enter operation post > param shared-a",
        "leave operation post > param shared-a",
        "leave operation: post",
      ]
    `);
  });

  it('should visit with context same refs with gaps in visitor simple', async () => {
    const calls: string[] = [];

    const testRuleSet: Oas3RuleSet = {
      test: vi.fn(() => {
        return {
          PathItem: {
            Parameter: {
              enter: vi.fn((param, _ctx, parents) =>
                calls.push(`enter path ${parents.PathItem.id} > param ${param.name}`)
              ),
            },
          },
        };
      }),
    };

    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        paths:
          /pet:
            id: pet
            parameters:
              $ref: '#/components/fake_parameters_list'
            get:
              operationId: get
              parameters:
                - $ref: '#/components/parameters/shared_a'
                - name: get_b
          /dog:
            id: dog
            post:
              operationId: post
              parameters:
                - $ref: '#/components/parameters/shared_a'
        components:
          fake_parameters_list:
            - name: path-param
          parameters:
            shared_a:
              name: shared-a
      `,
      ''
    );

    await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        plugins: [
          {
            id: 'test',
            rules: {
              oas3: testRuleSet,
            },
          },
        ],
        rules: {
          'test/test': 'error',
        },
      }),
    });

    expect(calls).toMatchInlineSnapshot(`
      [
        "enter path pet > param path-param",
        "enter path pet > param shared-a",
        "enter path pet > param get_b",
        "enter path dog > param shared-a",
      ]
    `);
  });

  it('should correctly visit more specific visitor', async () => {
    const calls: string[] = [];

    const testRuleSet: Oas3RuleSet = {
      test: vi.fn(() => {
        return {
          PathItem: {
            Parameter: {
              enter: vi.fn((param, _ctx, parents) =>
                calls.push(`enter path ${parents.PathItem.id} > param ${param.name}`)
              ),
            },
            Operation: {
              Parameter: {
                enter: vi.fn((param, _ctx, parents) =>
                  calls.push(
                    `enter operation ${parents.Operation.operationId} > param ${param.name}`
                  )
                ),
              },
            },
          },
        };
      }),
    };

    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        paths:
          /pet:
            id: pet
            parameters:
             - name: path-param
            get:
              operationId: get
              parameters:
                - $ref: '#/components/parameters/shared_a'
                - name: get_b
                - name: get_c
          /dog:
            id: dog
            post:
              operationId: post
              parameters:
                - $ref: '#/components/parameters/shared_b'
        components:
          parameters:
            shared_a:
              name: shared-a
            shared_b:
              name: shared-b
      `,
      ''
    );

    await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        plugins: [
          {
            id: 'test',
            rules: {
              oas3: testRuleSet,
            },
          },
        ],
        rules: {
          'test/test': 'error',
        },
      }),
    });

    expect(calls).toMatchInlineSnapshot(`
      [
        "enter path pet > param path-param",
        "enter operation get > param shared-a",
        "enter operation get > param get_b",
        "enter operation get > param get_c",
        "enter operation post > param shared-b",
      ]
    `);
  });

  it('should visit with context same refs with gaps in visitor and nested rule', async () => {
    const calls: string[] = [];

    const testRuleSet: Oas3RuleSet = {
      test: vi.fn(() => {
        return {
          PathItem: {
            Parameter: {
              enter: vi.fn((param, _ctx, parents) =>
                calls.push(`enter path ${parents.PathItem.id} > param ${param.name}`)
              ),
              leave: vi.fn((param, _ctx, parents) =>
                calls.push(`leave path ${parents.PathItem.id} > param ${param.name}`)
              ),
            },
            Operation(op: any, _ctx: any, parents: any) {
              calls.push(`enter path ${parents.PathItem.id} > op ${op.operationId}`);
            },
          },
        };
      }),
    };

    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        paths:
          /pet:
            id: pet
            parameters:
             - name: path-param
            get:
              operationId: get
              parameters:
                - $ref: '#/components/parameters/shared_a'
                - name: get_b
          /dog:
            id: dog
            post:
              operationId: post
              parameters:
                - $ref: '#/components/parameters/shared_a'
        components:
          parameters:
            shared_a:
              name: shared-a
      `,
      ''
    );

    await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        plugins: [
          {
            id: 'test',
            rules: {
              oas3: testRuleSet,
            },
          },
        ],
        rules: {
          'test/test': 'error',
        },
      }),
    });

    expect(calls).toMatchInlineSnapshot(`
      [
        "enter path pet > param path-param",
        "leave path pet > param path-param",
        "enter path pet > op get",
        "enter path pet > param shared-a",
        "leave path pet > param shared-a",
        "enter path pet > param get_b",
        "leave path pet > param get_b",
        "enter path dog > op post",
        "enter path dog > param shared-a",
        "leave path dog > param shared-a",
      ]
    `);
  });

  it('should visit and do not recurse for circular refs top-level', async () => {
    const calls: string[] = [];

    const testRuleSet: Oas3RuleSet = {
      test: vi.fn(() => {
        return {
          Schema: vi.fn((schema: any) => calls.push(`enter schema ${schema.id}`)),
        };
      }),
    };

    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        paths:
          /pet:
            id: pet
            parameters:
             - name: path-param
               schema:
                 $ref: "#/components/parameters/shared_a"
        components:
          parameters:
            shared_a:
              id: 'shared_a'
              allOf:
                - $ref: "#/components/parameters/shared_a"
                - id: 'nested'
      `,
      ''
    );

    await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        plugins: [
          {
            id: 'test',
            rules: {
              oas3: testRuleSet,
            },
          },
        ],
        rules: {
          'test/test': 'error',
        },
      }),
    });

    expect(calls).toMatchInlineSnapshot(`
      [
        "enter schema shared_a",
        "enter schema nested",
      ]
    `);
  });

  it('should visit and do not recurse for circular refs with context', async () => {
    const calls: string[] = [];

    const testRuleSet: Oas3RuleSet = {
      test: vi.fn(() => {
        return {
          Parameter: {
            Schema: vi.fn((schema: any, _ctx, parents) =>
              calls.push(`enter param ${parents.Parameter.name} > schema ${schema.id}`)
            ),
          },
        };
      }),
    };

    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        paths:
          /pet:
            id: pet
            parameters:
            - name: a
              schema:
                $ref: "#/components/parameters/shared_a"
            - name: b
              schema:
                $ref: "#/components/parameters/shared_a"
        components:
          parameters:
            shared_a:
              id: 'shared_a'
              properties:
                a:
                  id: a
              allOf:
                - $ref: "#/components/parameters/shared_a"
                - id: 'nested'
      `,
      ''
    );

    await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        plugins: [
          {
            id: 'test',
            rules: {
              oas3: testRuleSet,
            },
          },
        ],
        rules: {
          'test/test': 'error',
        },
      }),
    });

    expect(calls).toMatchInlineSnapshot(`
      [
        "enter param a > schema shared_a",
        "enter param b > schema shared_a",
      ]
    `);
  });

  it('should correctly skip top level', async () => {
    const calls: string[] = [];

    const testRuleSet: Oas3RuleSet = {
      test: vi.fn(() => {
        return {
          Operation: {
            skip: (op: any) => op.operationId === 'put',
            enter: vi.fn((op: any) => calls.push(`enter operation ${op.operationId}`)),
            leave: vi.fn((op: any) => calls.push(`leave operation ${op.operationId}`)),
          },
        };
      }),
    };

    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        paths:
          /pet:
            get:
              operationId: get
            put:
              operationId: put
      `,
      ''
    );

    await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        plugins: [
          {
            id: 'test',
            rules: {
              oas3: testRuleSet,
            },
          },
        ],
        rules: {
          'test/test': 'error',
        },
      }),
    });

    expect(calls).toMatchInlineSnapshot(`
      [
        "enter operation get",
        "leave operation get",
      ]
    `);
  });

  it('should correctly skip nested levels', async () => {
    const calls: string[] = [];

    const testRuleSet: Oas3RuleSet = {
      test: vi.fn(() => {
        return {
          Operation: {
            skip: (op: any) => op.operationId === 'put',
            Parameter: vi.fn((param, _ctx, parents) =>
              calls.push(`enter operation ${parents.Operation.operationId} > param ${param.name}`)
            ),
          },
        };
      }),
    };

    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        paths:
          /pet:
            get:
              operationId: get
              parameters:
                - $ref: '#/components/parameters/shared_a'
                - name: get_b
                - name: get_c
            put:
              operationId: put
              parameters:
                - $ref: '#/components/parameters/shared_a'
                - name: get_b
                - name: get_c
        components:
          parameters:
            shared_a:
              name: shared-a
      `,
      ''
    );

    await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        plugins: [
          {
            id: 'test',
            rules: {
              oas3: testRuleSet,
            },
          },
        ],
        rules: {
          'test/test': 'error',
        },
      }),
    });

    expect(calls).toMatchInlineSnapshot(`
      [
        "enter operation get > param shared-a",
        "enter operation get > param get_b",
        "enter operation get > param get_c",
      ]
    `);
  });

  it('should correctly visit more specific visitor with skips', async () => {
    const calls: string[] = [];

    const testRuleSet: Oas3RuleSet = {
      test: vi.fn(() => {
        return {
          PathItem: {
            Parameter: {
              enter: vi.fn((param, _ctx, parents) =>
                calls.push(`enter path ${parents.PathItem.id} > param ${param.name}`)
              ),
              leave: vi.fn((param, _ctx, parents) =>
                calls.push(`leave path ${parents.PathItem.id} > param ${param.name}`)
              ),
            },
            Operation: {
              skip: (op: any) => op.operationId === 'put',
              Parameter: {
                enter: vi.fn((param, _ctx, parents) =>
                  calls.push(
                    `enter operation ${parents.Operation.operationId} > param ${param.name}`
                  )
                ),
                leave: vi.fn((param, _ctx, parents) =>
                  calls.push(
                    `leave operation ${parents.Operation.operationId} > param ${param.name}`
                  )
                ),
              },
            },
          },
        };
      }),
    };

    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        paths:
          /pet:
            id: pet
            parameters:
             - name: path-param
            get:
              operationId: get
              parameters:
                - $ref: '#/components/parameters/shared_a'
                - name: get_b
                - name: get_c
            put:
              operationId: put
              parameters:
                - $ref: '#/components/parameters/shared_a'
                - name: get_b
                - name: get_c
          /dog:
            id: dog
            post:
              operationId: post
              parameters:
                - $ref: '#/components/parameters/shared_b'
        components:
          parameters:
            shared_a:
              name: shared-a
            shared_b:
              name: shared-b
      `,
      ''
    );

    await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        plugins: [
          {
            id: 'test',
            rules: {
              oas3: testRuleSet,
            },
          },
        ],
        rules: {
          'test/test': 'error',
        },
      }),
    });

    expect(calls).toMatchInlineSnapshot(`
      [
        "enter path pet > param path-param",
        "leave path pet > param path-param",
        "enter operation get > param shared-a",
        "leave operation get > param shared-a",
        "enter operation get > param get_b",
        "leave operation get > param get_b",
        "enter operation get > param get_c",
        "leave operation get > param get_c",
        "enter operation post > param shared-b",
        "leave operation post > param shared-b",
      ]
    `);
  });

  it('should correctly visit with nested rules', async () => {
    const calls: string[] = [];

    const testRuleSet: Oas3RuleSet = {
      test: vi.fn(() => {
        return {
          Schema: {
            Schema: {
              enter: vi.fn((schema: any, _ctx, parents) =>
                calls.push(`enter nested schema ${parents.Schema.id} > ${schema.id}`)
              ),
              leave: vi.fn((schema: any, _ctx, parents) =>
                calls.push(`leave nested schema ${parents.Schema.id} > ${schema.id}`)
              ),
            },
          },
        };
      }),
    };

    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        paths:
          /pet:
            get:
              requestBody:
                content:
                  application/json:
                    schema:
                      id: inline-top
                      type: object
                      properties:
                        b:
                          $ref: "#/components/schemas/b"
                        a:
                          type: object
                          id: inline-nested-2
                          properties:
                            a:
                              id: inline-nested-nested-2
        components:
          schemas:
            b:
              id: inline-top
              type: object
              properties:
                a:
                  type: object
                  id: inline-nested
                  properties:
                    a:
                      id: inline-nested-nested
      `,
      'foobar.yaml'
    );

    await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        plugins: [
          {
            id: 'test',
            rules: {
              oas3: testRuleSet,
            },
          },
        ],
        rules: {
          'test/test': 'error',
        },
      }),
    });

    expect(calls).toMatchInlineSnapshot(`
      [
        "enter nested schema inline-top > inline-top",
        "enter nested schema inline-top > inline-nested",
        "enter nested schema inline-nested > inline-nested-nested",
        "leave nested schema inline-nested > inline-nested-nested",
        "leave nested schema inline-top > inline-nested",
        "leave nested schema inline-top > inline-top",
        "enter nested schema inline-top > inline-nested-2",
        "enter nested schema inline-nested-2 > inline-nested-nested-2",
        "leave nested schema inline-nested-2 > inline-nested-nested-2",
        "leave nested schema inline-top > inline-nested-2",
      ]
    `);
  });

  it('should correctly visit refs', async () => {
    const calls: string[] = [];

    const testRuleSet: Oas3RuleSet = {
      test: vi.fn(() => {
        return {
          ref(node: any, _: any, { node: target }: any) {
            calls.push(`enter $ref ${node.$ref} with target ${target?.name}`);
          },
        };
      }),
    };

    const document = parseYamlToDocument(
      outdent`
      openapi: 3.0.0
      paths:
        /pet:
          id: pet
          parameters:
           - name: path-param
          get:
            operationId: get
            parameters:
              - $ref: '#/components/parameters/shared_b'
          put:
            operationId: put
            parameters:
              - $ref: '#/components/parameters/shared_a'
        /dog:
          id: dog
          post:
            operationId: post
            schema:
              example:
                $ref: 123
            parameters:
              - $ref: '#/components/parameters/shared_a'
      components:
        parameters:
          shared_a:
            name: shared-a
          shared_b:
            name: shared-b
            schema:
              $ref: '#/components/parameters/shared_b'
      `,
      'foobar.yaml'
    );

    await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        plugins: [
          {
            id: 'test',
            rules: {
              oas3: testRuleSet,
            },
          },
        ],
        rules: {
          'test/test': 'error',
        },
      }),
    });

    expect(calls).toMatchInlineSnapshot(`
      [
        "enter $ref #/components/parameters/shared_b with target shared-b",
        "enter $ref #/components/parameters/shared_b with target shared-b",
        "enter $ref #/components/parameters/shared_a with target shared-a",
        "enter $ref #/components/parameters/shared_a with target shared-a",
      ]
    `);
  });

  it('should correctly visit refs', async () => {
    const calls: string[] = [];

    const testRuleSet: Oas3RuleSet = {
      test: vi.fn(() => {
        return {
          NamedSchemas: {
            Schema(node: any, { key }: any) {
              calls.push(`enter schema ${key}: ${node.type}`);
            },
          },
        };
      }),
    };

    const document = parseYamlToDocument(
      outdent`
      openapi: 3.0.0
      components:
        schemas:
          a:
            type: string
          b:
            type: number
      `,
      'foobar.yaml'
    );

    await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        plugins: [
          {
            id: 'test',
            rules: {
              oas3: testRuleSet,
            },
          },
        ],
        rules: {
          'test/test': 'error',
        },
      }),
    });

    expect(calls).toMatchInlineSnapshot(`
      [
        "enter schema a: string",
        "enter schema b: number",
      ]
    `);
  });

  it('should correctly visit any visitor', async () => {
    const calls: string[] = [];

    const testRuleSet: Oas3RuleSet = {
      test: vi.fn(() => {
        return {
          ref: {
            enter(ref: any) {
              calls.push(`enter ref ${ref.$ref}`);
            },
            leave(ref: any) {
              calls.push(`leave ref ${ref.$ref}`);
            },
          },
          any: {
            enter(_node: any, { type }: any) {
              calls.push(`enter ${type.name}`);
            },
            leave(_node: any, { type }: any) {
              calls.push(`leave ${type.name}`);
            },
          },
        };
      }),
    };

    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        paths:
          /pet:
            id: pet
            parameters:
             - name: path-param
            get:
              operationId: get
              parameters:
                - $ref: '#/components/parameters/shared_a'
                - name: get_b
                - name: get_c
        components:
          parameters:
            shared_a:
              name: shared-a
          schemas:
            a:
              type: object
      `,
      ''
    );

    await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        plugins: [
          {
            id: 'test',
            rules: {
              oas3: testRuleSet,
            },
          },
        ],
        rules: {
          'test/test': 'error',
        },
      }),
    });

    expect(calls).toMatchInlineSnapshot(`
      [
        "enter Root",
        "enter Paths",
        "enter PathItem",
        "enter ParameterList",
        "enter Parameter",
        "leave Parameter",
        "leave ParameterList",
        "enter Operation",
        "enter ParameterList",
        "enter ref #/components/parameters/shared_a",
        "enter Parameter",
        "leave Parameter",
        "leave ref #/components/parameters/shared_a",
        "enter Parameter",
        "leave Parameter",
        "enter Parameter",
        "leave Parameter",
        "leave ParameterList",
        "leave Operation",
        "leave PathItem",
        "leave Paths",
        "enter Components",
        "enter NamedParameters",
        "leave NamedParameters",
        "enter NamedSchemas",
        "enter Schema",
        "leave Schema",
        "leave NamedSchemas",
        "leave Components",
        "leave Root",
      ]
    `);
  });
});

describe('context.report', () => {
  it('should report errors correctly', async () => {
    const testRuleSet: Oas3RuleSet = {
      test: vi.fn(() => {
        return {
          Parameter: {
            enter: vi.fn((param, ctx) => {
              if (param.name.indexOf('_') > -1) {
                ctx.report({
                  message: `Parameter name shouldn't contain '_: ${param.name}`,
                });
              }
            }),
          },
        };
      }),
    };

    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        info:
          contact: {}
          license: {}
        paths:
          /pet:
            parameters:
              - name: path-param
            get:
              operationId: get
              parameters:
                - name: get_a
                - name: get_b
            post:
              operationId: post
              parameters:
                - $ref: '#/components/parameters/shared_a'
        components:
          parameters:
            shared_a:
              name: shared_a
      `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        plugins: [
          {
            id: 'test',
            rules: {
              oas3: testRuleSet,
            },
          },
        ],
        rules: {
          'test/test': 'error',
        },
      }),
    });

    expect(results).toHaveLength(3);
    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/paths/~1pet/get/parameters/0",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Parameter name shouldn't contain '_: get_a",
          "ruleId": "test/test",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/paths/~1pet/get/parameters/1",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Parameter name shouldn't contain '_: get_b",
          "ruleId": "test/test",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/components/parameters/shared_a",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Parameter name shouldn't contain '_: shared_a",
          "ruleId": "test/test",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should report errors correctly', async () => {
    const testRuleSet: Oas3RuleSet = {
      test: vi.fn(() => {
        return {
          Parameter: {
            enter: vi.fn((param, ctx) => {
              if (param.name.indexOf('_') > -1) {
                ctx.report({
                  message: `Parameter name shouldn't contain '_: ${param.name}`,
                });
              }
            }),
          },
        };
      }),
    };

    const cwd = path.join(__dirname, 'fixtures/refs');
    const externalRefResolver = new BaseResolver();
    const document = (await externalRefResolver.resolveDocument(
      null,
      `${cwd}/openapi-with-external-refs.yaml`
    )) as Document;

    if (document === null) {
      throw 'Should never happen';
    }

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        plugins: [
          {
            id: 'test',
            rules: {
              oas3: testRuleSet,
            },
          },
        ],
        rules: {
          'test/test': 'error',
        },
      }),
    });

    expect(results).toHaveLength(4);
    expect(replaceSourceWithRef(results, cwd)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/components/parameters/path-param",
              "reportOnKey": false,
              "source": "openapi-with-external-refs.yaml",
            },
          ],
          "message": "Parameter name shouldn't contain '_: path_param",
          "ruleId": "test/test",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/components/parameters/param-a",
              "reportOnKey": false,
              "source": "openapi-with-external-refs.yaml",
            },
          ],
          "message": "Parameter name shouldn't contain '_: param_a",
          "ruleId": "test/test",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/",
              "reportOnKey": false,
              "source": "param-c.yaml",
            },
          ],
          "message": "Parameter name shouldn't contain '_: param_c",
          "ruleId": "test/test",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/",
              "reportOnKey": false,
              "source": "param-b.yaml",
            },
          ],
          "message": "Parameter name shouldn't contain '_: param_b",
          "ruleId": "test/test",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should report errors with custom messages', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        info:
          license: {}
        paths: {}
      `,
      'foobar.yaml'
    );

    const config = await createConfig(`
      rules:
        info-contact: 
          message: "MY ERR DESCRIPTION: {{message}}"
          severity: "error"
    `);

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: config,
    });

    expect(results).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/info/contact",
              "reportOnKey": true,
              "source": Source {
                "absoluteRef": "foobar.yaml",
                "body": "openapi: 3.0.0
      info:
        license: {}
      paths: {}",
                "mimeType": undefined,
              },
            },
          ],
          "message": "MY ERR DESCRIPTION: Info object should contain \`contact\` field.",
          "ruleId": "info-contact",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });
});

describe('context.resolve', () => {
  it('should resolve refs correctly', async () => {
    const testRuleSet: Oas3RuleSet = {
      test: vi.fn(() => {
        return {
          Schema: vi.fn((schema, { resolve }) => {
            if (schema.properties) {
              expect(schema.properties.a.$ref).toBeDefined();
              const { location, node } = resolve(schema.properties.a);
              expect(node).toMatchInlineSnapshot(`
                {
                  "type": "string",
                }
              `);
              expect(location?.pointer).toEqual('#/components/schemas/b');
              expect(location?.source).toStrictEqual(document.source);
            }
          }),
        };
      }),
    };

    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        info:
          contact: {}
          license: {}
        paths: {}
        components:
          schemas:
            b:
              type: string
            a:
              type: object
              properties:
                a:
                  $ref: '#/components/schemas/b'
      `,
      'foobar.yaml'
    );

    await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        plugins: [
          {
            id: 'test',
            rules: {
              oas3: testRuleSet,
            },
          },
        ],
        rules: {
          'test/test': 'error',
        },
      }),
    });
  });
});

describe('type extensions', () => {
  test.each([
    ['3.0.0', 'oas3_0'],
    ['3.1.0', 'oas3_1'],
  ])('should correctly visit OpenAPI %s extended types', async (openapi, oas) => {
    const calls: string[] = [];

    const testRuleSet: Oas3RuleSet = {
      test: vi.fn(() => {
        return {
          any: {
            enter(_node: any, { type }: any) {
              calls.push(`enter ${type.name}`);
            },
            leave(_node: any, { type }: any) {
              calls.push(`leave ${type.name}`);
            },
          },
          XWebHooks: {
            enter(hook: any) {
              calls.push(`enter hook ${hook.name}`);
            },
            leave(hook: any) {
              calls.push(`leave hook ${hook.name}`);
            },
          },
        };
      }),
    };

    const document = parseYamlToDocument(
      outdent`
        openapi: ${openapi}
        x-webhooks:
          name: test
          parameters:
            - name: a
      `,
      'foobar.yaml'
    );

    await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        plugins: [
          {
            id: 'test',
            typeExtension: {
              oas3(types, version) {
                expect(version).toEqual(oas);

                return {
                  ...types,
                  XWebHooks: {
                    properties: {
                      parameters: listOf('Parameter'),
                    },
                  },
                  Root: {
                    ...types.Root,
                    properties: {
                      ...types.Root.properties,
                      'x-webhooks': 'XWebHooks',
                    },
                  },
                };
              },
            },
            rules: {
              oas3: testRuleSet,
            },
          },
        ],
        rules: {
          'test/test': 'error',
        },
      }),
    });

    expect(calls).toEqual([
      'enter Root',
      'enter XWebHooks',
      'enter hook test',
      'enter ParameterList',
      'enter Parameter',
      'leave Parameter',
      'leave ParameterList',
      'leave hook test',
      'leave XWebHooks',
      'leave Root',
    ]);
  });
});

describe('ignoreNextRules', () => {
  it('should correctly skip top level', async () => {
    const calls: string[] = [];

    const testRuleSet: Oas3RuleSet = {
      skip: vi.fn(() => {
        return {
          Operation: {
            enter: vi.fn((op, ctx) => {
              if (op.operationId === 'get') {
                ctx.ignoreNextVisitorsOnNode();
                calls.push(`enter and skip operation ${op.operationId}`);
              } else {
                calls.push(`enter and not skip operation ${op.operationId}`);
              }
            }),
            leave: vi.fn((op) => {
              if (op.operationId === 'get') {
                calls.push(`leave skipped operation ${op.operationId}`);
              } else {
                calls.push(`leave not skipped operation ${op.operationId}`);
              }
            }),
          },
        };
      }),
      test: vi.fn(() => {
        return {
          Operation: {
            enter: vi.fn((op) => calls.push(`enter operation ${op.operationId}`)),
            leave: vi.fn((op) => calls.push(`leave operation ${op.operationId}`)),
          },
        };
      }),
    };

    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        paths:
          /pet:
            get:
              operationId: get
            put:
              operationId: put
      `,
      ''
    );

    await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await createConfig({
        plugins: [
          {
            id: 'test',
            rules: {
              oas3: testRuleSet,
            },
          },
        ],
        rules: {
          'test/skip': 'error',
          'test/test': 'error',
        },
      }),
    });

    expect(calls).toMatchInlineSnapshot(`
      [
        "enter and skip operation get",
        "leave skipped operation get",
        "enter and not skip operation put",
        "enter operation put",
        "leave not skipped operation put",
        "leave operation put",
      ]
    `);
  });
});
