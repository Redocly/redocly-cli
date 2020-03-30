import { OpenAPIParameter } from './OpenAPIParameter';

export const OpenAPIParameterMap = {
  name: 'OpenAPIParameterMap',
  isIdempotent: true,
  properties(node) {
    const props = {};
    Object.keys(node).forEach((k) => {
      props[k] = OpenAPIParameter;
    });
    return props;
  },
};

export default OpenAPIParameterMap;
