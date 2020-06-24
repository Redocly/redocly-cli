import { Oas3Rule } from '../../visitors';

const defaultOrder = ['get', 'head', 'post', 'put', 'patch', 'delete', 'options', 'trace'];

export const PathHttpVerbsOrder: Oas3Rule = (opts: any) => {
  const order: string[] = (opts && opts.order) || defaultOrder;
  if (!Array.isArray(order)) {
    throw new Error('path-http-verbs-order `order` option must be an array');
  }

  return {
    PathItem(path, { report, location }) {
      const httpVerbs = Object.keys(path).filter((k) => order.includes(k));

      for (let i = 0; i < httpVerbs.length - 1; i++) {
        const aIdx = order.indexOf(httpVerbs[i]);
        const bIdx = order.indexOf(httpVerbs[i + 1]);
        if (bIdx < aIdx) {
          report({
            message: 'Operation http verbs must be ordered',
            location: { reportOnKey: true, ...location.child(httpVerbs[i + 1]) },
          });
        }
      }
    },
  };
};
