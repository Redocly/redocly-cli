import { OpenAPILink } from './OpenAPILink';

export const OpenAPILinkMap = {
  isIdempotent: true,
  properties(node) {
    const props = {};
    Object.keys(node).forEach((k) => {
      props[k] = OpenAPILink;
    });
    return props;
  },
};

export default OpenAPILinkMap;
