import fs from 'fs';
import yaml from 'js-yaml';
import createError from '../default';

const getSource = () => fs.readFileSync('./test/specs/openapi/test-1.yaml', 'utf-8');

const createContext = () => ({
  document: yaml.safeLoad(getSource()),
  path: ['paths', '/user/{userId}/{name}', 'get', 'parameters', 0, 'required'],
  pathStack: [],
  source: getSource(),
  enableCodeframe: true,
});

describe('createError', () => {
  test('', () => {
    const ctx = createContext();
    const node = { required: 123 };
    const error = createError('test error msg', node, ctx);
    expect(error).toMatchInlineSnapshot(`
      Object {
        "codeFrame": "
            parameters:
              - name: userId
                in: path
                [4m[31mrequired: true
      [39m[24m          description: Id of a user
                schema:
       ",
        "location": Object {
          "endCol": 25,
          "endIndex": 343,
          "endLine": 19,
          "startCol": 11,
          "startIndex": 329,
          "startLine": 19,
        },
        "message": "test error msg",
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

  test('create error with no codeframe', () => {
    const ctx = createContext();
    ctx.enableCodeframe = false;
    const node = { required: 123 };
    const error = createError('test error msg', node, ctx);
    expect(error).toMatchInlineSnapshot(`
      Object {
        "codeFrame": null,
        "location": Object {
          "endCol": 25,
          "endIndex": 343,
          "endLine": 19,
          "startCol": 11,
          "startIndex": 329,
          "startLine": 19,
        },
        "message": "test error msg",
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

  test('pretty print error', () => {
    const ctx = createContext();
    const node = { required: 123 };
    const error = createError('test error msg', node, ctx);
    expect(error.prettyPrint()).toMatchInlineSnapshot(`
      "19:11 Following error occured:
      test error msg by path paths//user/{userId}/{name}/get/parameters/0/required

            parameters:
              - name: userId
                in: path
                [4m[31mrequired: true
      [39m[24m          description: Id of a user
                schema:
       
      "
    `);
  });

  test('pretty print error without codeframe', () => {
    const ctx = createContext();
    ctx.enableCodeframe = false;
    const node = { required: 123 };
    const error = createError('test error msg', node, ctx);
    expect(error.prettyPrint()).toMatchInlineSnapshot(`
      "19:11 Following error occured:
      test error msg by path paths//user/{userId}/{name}/get/parameters/0/required
      "
    `);
  });

  test('create error with path stack', () => {
    const ctx = createContext();
    ctx.pathStack = [
      ['paths', '/user/{userId}/{name}', 'post', 'parameters', 0, 'required'],
    ];
    const node = { required: 123 };
    const error = createError('test error msg', node, ctx);
    expect(error).toMatchInlineSnapshot(`
      Object {
        "codeFrame": "
            parameters:
              - name: userId
                in: path
                [4m[31mrequired: true
      [39m[24m          description: Id of a user
                schema:
       ",
        "location": Object {
          "endCol": 25,
          "endIndex": 343,
          "endLine": 19,
          "startCol": 11,
          "startIndex": 329,
          "startLine": 19,
        },
        "message": "test error msg",
        "path": "paths//user/{userId}/{name}/get/parameters/0/required",
        "pathStack": Array [
          "paths//user/{userId}/{name}/post/parameters/0/required",
        ],
        "prettyPrint": [Function],
        "severity": "ERROR",
        "value": Object {
          "required": 123,
        },
      }
    `);
  });

  test('pretty print error with path stack', () => {
    const ctx = createContext();
    ctx.pathStack = [
      ['paths', '/user/{userId}/{name}', 'post', 'parameters', 0, 'required'],
    ];
    const node = { required: 123 };
    const error = createError('test error msg', node, ctx);
    expect(error.prettyPrint()).toMatchInlineSnapshot(`
      "19:11 Following error occured:
      test error msg by path paths//user/{userId}/{name}/get/parameters/0/required

            parameters:
              - name: userId
                in: path
                [4m[31mrequired: true
      [39m[24m          description: Id of a user
                schema:
       

      Error traced by following path:
      paths//user/{userId}/{name}/post/parameters/0/required"
    `);
  });
});
