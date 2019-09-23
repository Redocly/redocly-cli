import fs from 'fs';

import traverse from '../traverse';
import { createErrrorFieldTypeMismatch } from '../error';

const getSource = () => fs.readFileSync('./test/specs/openapi/test-3.yaml', 'utf-8');

test('Traverse over a flat node with empty resolver', () => {
  const node = {
    name: 'test node',
    value: 12,
  };
  const resolver = {};
  expect(traverse(node, resolver)).toMatchInlineSnapshot('Array []');
});

test('', () => {
  const node = {
    field: 12,
    b: 12,
    'x-allowed': true,
    child: {
      a: 'text',
    },
  };
  const resolver = {
    validators: {
      field() {
        return (targetNode, ctx) => (typeof node.field === 'string'
          ? null
          : createErrrorFieldTypeMismatch('string', targetNode, ctx));
      },
    },
    properties: {
      child: {
        validators: {
          a() {
            return () => null;
          },
        },
      },
    },
  };
  expect(traverse(node, resolver, getSource())).toMatchInlineSnapshot(`
    Array [
      Object {
        "codeFrame": null,
        "location": Object {
          "endCol": 2,
          "endIndex": 11,
          "endLine": 2,
          "startCol": 1,
          "startIndex": 10,
          "startLine": 2,
        },
        "message": "b is not allowed here. Use \\"x-\\" prefix to override this behavior",
        "path": "b",
        "pathStack": Array [],
        "prettyPrint": [Function],
        "severity": "ERROR",
        "value": Object {
          "b": 12,
          "child": Object {
            "a": "text",
          },
          "field": 12,
          "x-allowed": true,
        },
      },
      Object {
        "codeFrame": null,
        "location": Object {
          "endCol": 0,
          "endIndex": 5,
          "endLine": 1,
          "startCol": 0,
          "startIndex": 0,
          "startLine": 1,
        },
        "message": "This field must be of string type",
        "path": "field",
        "pathStack": Array [],
        "prettyPrint": [Function],
        "severity": "ERROR",
        "value": Object {
          "b": 12,
          "child": Object {
            "a": "text",
          },
          "field": 12,
          "x-allowed": true,
        },
      },
    ]
  `);
});
