import fs from 'fs';

import traverse from '../traverse';
import { createErrrorFieldTypeMismatch } from '../error';

const getSource = () => fs.readFileSync('./test/specs/openapi/test-3.yaml', 'utf-8');


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
});
