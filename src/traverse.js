import resolveNode from './resolver';
import createError from './error';

const validateNode = (node, definition, ctx) => {
  if (node && definition && definition.validators) {
    // TODO: enable this validation when completed with all allowed fields in validators
    const allowedChildren = [
      ...(Object.keys(definition.properties || {})),
      ...(Object.keys(definition.validators || {})),
    ];
    Object.keys(node).forEach((field) => {
      ctx.path.push(field);

      if (!allowedChildren.includes(field) && field.indexOf('x-') !== 0) {
        ctx.result.push(createError('This field is not permitted here', node, ctx, 'key'));
      }

      ctx.path.pop();
    });

    Object.keys(definition.validators).forEach((v) => {
      if (Object.keys(node).includes(v)) ctx.path.push(v);
      const validationResult = definition.validators[v]()(node, ctx);
      if (Object.keys(node).includes(v)) ctx.path.pop();
      if (validationResult) ctx.result.push(validationResult);
    });
  }
};

const traverseNode = (node, definition, ctx) => {
  const currentPath = ctx.path.join('/');

  // TO-DO: refactor ctx.visited into dictionary for O(1) check time
  if (ctx.visited.includes(currentPath)) return;
  ctx.visited.push(currentPath);

  if (!node || !definition) return;

  // console.log(`Current path: ${currentPath}`);
  let nextPath;
  let prevPath;
  let resolvedNode;
  // eslint-disable-next-line prefer-const
  ({ node: resolvedNode, nextPath } = resolveNode(node, ctx));
  if (nextPath) {
    ctx.pathStack.push(ctx.path);
    prevPath = ctx.path;
    ctx.path = nextPath.replace('#/', '').split('/');
  }

  if (Array.isArray(resolvedNode)) {
    resolvedNode.forEach((nodeChild, i) => {
      ctx.path.push(i);
      traverseNode(nodeChild, definition, ctx);
      ctx.path.pop();
    });
    if (nextPath) ctx.path = prevPath;
    return;
  }

  validateNode(resolvedNode, definition, ctx);

  if (definition.properties) {
    let nodeChildres;
    switch (typeof definition.properties) {
      case 'function':
        nodeChildres = definition.properties(resolvedNode);

        Object.keys(nodeChildres).forEach((child) => {
          if (Object.keys(resolvedNode).includes(child)) {
            ctx.path.push(child);
            if (resolvedNode[child]) traverseNode(resolvedNode[child], nodeChildres[child], ctx);
            ctx.path.pop();
          }
        });

        break;
      case 'object':

        Object.keys(definition.properties).forEach((p) => {
          ctx.path.push(p);
          if (typeof definition.properties[p] === 'function') {
            if (resolvedNode[p]) traverseNode(resolvedNode[p], definition.properties[p](), ctx);
          } else if (node[p]) {
            traverseNode(resolvedNode[p], definition.properties[p], ctx);
          }
          ctx.path.pop();
        });

        break;
      default:
        break;
    }
  }
  if (nextPath) ctx.path = ctx.pathStack.pop();
};

const traverse = (node, definition, sourceFile) => {
  const ctx = {
    document: node,
    path: [],
    visited: [],
    result: [],
    pathStack: [],
    source: sourceFile,
    // enableCodeframe: true,
  };
  traverseNode(node, definition, ctx);
  return ctx.result;
};

export default traverse;
