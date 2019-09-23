import createError from './error';

/**
 *
 * Here we simply go over each of the steps in the link and try to retreive the value
 * for it. If failed (e.g. because of undefined value) -- return null, to indicate that such
 * reference does not exist.
 *
 * @param {string} link A path in the yaml document which is to be resolved
 * @param {*} document JSON Object which represents the YAML structure
 */
const resolve = (link, document) => {
  const steps = link.replace('#/', '').split('/');
  let target = document;
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
      nextPath = node.$ref.replace('#/', '').split('/');
      resolved = resolve(node[p], ctx.document);
      if (!resolved) {
        ctx.result.push(createError('Refernce does not exist', node, ctx));
        resolved = node;
        nextPath = ctx.path;
      }
    }
  });
  return { node: resolved, nextPath };
};

export default resolveNode;
