// eslint-disable-next-line import/no-cycle
import { OpenAPIHeaderMap } from './OpenAPIHeader';
import { createErrrorFieldTypeMismatch } from '../error';

export default {
  validators: {
    contentType() {
      return (node, ctx) => {
        if (node && node.contentType && typeof node.contentType !== 'string') {
          return createErrrorFieldTypeMismatch('string', node, ctx);
        }
        return null;
      };
    },
    style() {
      return (node, ctx) => {
        if (node && node.style && typeof node.style !== 'string') {
          return createErrrorFieldTypeMismatch('string', node, ctx);
        }
        return null;
      };
    },
    explode() {
      return (node, ctx) => {
        if (node && node.explode && typeof node.explode !== 'boolean') {
          return createErrrorFieldTypeMismatch('boolean', node, ctx);
        }
        return null;
      };
    },
    allowReserved() {
      return (node, ctx) => {
        if (node && node.allowReserved && typeof node.allowReserved !== 'boolean') {
          return createErrrorFieldTypeMismatch('boolean', node, ctx);
        }
        return null;
      };
    },
  },
  properties: {
    headers: OpenAPIHeaderMap,
  },
};
