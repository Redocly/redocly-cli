import createError from './error';

const resolve = (link, ctx) => {
  const steps = link.replace('#/', '').split('/');
  let target = ctx.document;
  Object.keys(steps).forEach((step) => {
    target = steps[step] && target[steps[step]] ? target[steps[step]] : null;
  });
  return target;
};

const resolveNode = (node, ctx) => {
  if (!node || typeof node !== 'object') return { node, nextPath: null };
  let nextPath;
  let resolved = node;
  Object.keys(node).forEach((p) => {
    if (p === '$ref') {
      nextPath = node.$ref;
      resolved = resolve(node[p], ctx);
      if (!resolved) {
        ctx.result.push(createError('Refernce does not exist', node, ctx));
        resolved = node;
      }
    }
  });
  return { node: resolved, nextPath };
};

export default resolveNode;
