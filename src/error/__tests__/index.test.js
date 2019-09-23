import yaml from 'js-yaml';
import fs from 'fs';
import {
  createErrorMissingRequiredField,
  createErrorFieldNotAllowed,
  createErrrorFieldTypeMismatch,
  createErrorMutuallyExclusiveFields,
} from '..';

const getSource = () => fs.readFileSync('./test/specs/openapi/test-1.yaml', 'utf-8');

const createContext = () => ({
  document: yaml.safeLoad(getSource()),
  path: ['paths', '/user/{userId}/{name}', 'get', 'parameters'],
  pathStack: [],
  source: getSource(),
  enableCodeframe: true,
});

describe('createErrorFieldNotAllowed', () => {
  test('', () => {
    const ctx = createContext();
    const node = { required: 123 };
    const error = createErrorFieldNotAllowed('wrong', node, ctx);
    expect(error).toMatchInlineSnapshot(`
      Object {
        "codeFrame": "
          get:
            summary: Get a list of all users
            description: Also gives their status
            [4m[31mparameters:[39m[24m
              - name: userId
                in: path
       ",
        "location": Object {
          "endCol": 17,
          "endIndex": 275,
          "endLine": 16,
          "startCol": 7,
          "startIndex": 265,
          "startLine": 16,
        },
        "message": "wrong is not allowed here. Use \\"x-\\" prefix to override this behavior",
        "path": "paths//user/{userId}/{name}/get/parameters",
        "pathStack": Array [],
        "prettyPrint": [Function],
        "severity": "ERROR",
        "value": Object {
          "required": 123,
        },
      }
    `);
  });
});

describe('createErrorMissingRequiredField', () => {
  test('', () => {
    const ctx = createContext();
    const node = { required: 123 };
    const error = createErrorMissingRequiredField('name', node, ctx);
    expect(error).toMatchInlineSnapshot(`
      Object {
        "codeFrame": "
          get:
            summary: Get a list of all users
            description: Also gives their status
            [4m[31mparameters:
              - name: userId
                in: path
                required: true
                description: Id of a user
                schema:
                  type: integer
                  format: int64
                  minimum: 1
              - name: val
                in: query
                schema:
                  type: boolean
                  enum:
                    - false
                    - true
              - $ref: '#/components/parameters/name'
            r[39m[24mesponses:
              '200':
                description: Success
       ",
        "location": Object {
          "endCol": 7,
          "endIndex": 671,
          "endLine": 33,
          "startCol": 7,
          "startIndex": 265,
          "startLine": 16,
        },
        "message": "name must be present on this level",
        "path": "paths//user/{userId}/{name}/get/parameters",
        "pathStack": Array [],
        "prettyPrint": [Function],
        "severity": "ERROR",
        "value": Object {
          "required": 123,
        },
      }
    `);
  });
});

describe('createErrrorFieldTypeMismatch', () => {
  test('', () => {
    const ctx = createContext();
    ctx.path = [
      'paths',
      '/user/{userId}/{name}',
      'get',
      'parameters',
      0,
      'required',
    ];
    const node = { required: 123 };
    const error = createErrrorFieldTypeMismatch('boolean', node, ctx);
    expect(error).toMatchInlineSnapshot(`
      Object {
        "codeFrame": "
            parameters:
              - name: userId
                in: path
                [4m[31mrequired:[39m[24m true
                description: Id of a user
                schema:
       ",
        "location": Object {
          "endCol": 19,
          "endIndex": 337,
          "endLine": 19,
          "startCol": 11,
          "startIndex": 329,
          "startLine": 19,
        },
        "message": "This field must be of boolean type",
        "path": "paths//user/{userId}/{name}/get/parameters/0/required",
        "pathStack": Array [],
        "prettyPrint": [Function],
        "severity": "ERROR",
        "value": Object {
          "required": 123,
        },
      }
    `);
  });
});

describe('createErrorMutuallyExclusiveFields', () => {
  const ctx = createContext();
  ctx.path = [
    'paths',
    '/user/{userId}/{name}',
    'get',
    'parameters',
    0,
    'required',
  ];
  const node = { required: 123 };
  const error = createErrorMutuallyExclusiveFields(
    ['example', 'examples'],
    node,
    ctx,
  );
  expect(error).toMatchInlineSnapshot(`
    Object {
      "codeFrame": "
          parameters:
            - name: userId
              in: path
              [4m[31mrequired:[39m[24m true
              description: Id of a user
              schema:
     ",
      "location": Object {
        "endCol": 19,
        "endIndex": 337,
        "endLine": 19,
        "startCol": 11,
        "startIndex": 329,
        "startLine": 19,
      },
      "message": "example, examples are mutually exclusive",
      "path": "paths//user/{userId}/{name}/get/parameters/0/required",
      "pathStack": Array [],
      "prettyPrint": [Function],
      "severity": "ERROR",
      "value": Object {
        "required": 123,
      },
    }
  `);
});
