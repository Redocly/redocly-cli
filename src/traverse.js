/* eslint-disable no-use-before-define */
import resolveNode from './resolver';
import { createErrorFieldNotAllowed } from './error';

function validateNode(node, definition, ctx) {
  if (node && definition && definition.validators) {
    const allowedChildren = [
      ...(Object.keys(definition.properties || {})),
      ...(Object.keys(definition.validators || {})),
    ];

    Object.keys(node).forEach((field) => {
      ctx.path.push(field);

      if (!allowedChildren.includes(field) && field.indexOf('x-') !== 0 && field.indexOf('$ref') !== 0) {
        ctx.result.push(createErrorFieldNotAllowed(field, node, ctx));
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
}

function traverseChildren(resolvedNode, definition, ctx) {
  if (definition.properties) {
    let nodeChildren;
    switch (typeof definition.properties) {
      case 'function':
        nodeChildren = definition.properties(resolvedNode);
        Object.keys(nodeChildren).forEach((child) => {
          if (Object.keys(resolvedNode).includes(child)) {
            ctx.path.push(child);
            if (resolvedNode[child]) traverseNode(resolvedNode[child], nodeChildren[child], ctx);
            ctx.path.pop();
          }
        });

        break;
      case 'object':
        Object.keys(definition.properties).forEach((p) => {
          ctx.path.push(p);
          if (typeof definition.properties[p] === 'function') {
            if (resolvedNode[p]) traverseNode(resolvedNode[p], definition.properties[p](), ctx);
          } else if (resolvedNode[p]) {
            traverseNode(resolvedNode[p], definition.properties[p], ctx);
          }
          ctx.path.pop();
        });

        break;
      default:
        // do nothing
    }
  }
}

function onNodeEnter(node, ctx) {
  let nextPath;
  let prevPath;
  let resolvedNode;
  let updatedSource;
  let prevSource;
  let filePath;
  let prevFilePath;
  ({
    // eslint-disable-next-line prefer-const
    node: resolvedNode, nextPath, updatedSource, filePath,
  } = resolveNode(node, ctx));

  if (nextPath) {
    ctx.pathStack.push({ path: ctx.path, file: ctx.filePath });
    prevPath = ctx.path;
    ctx.path = nextPath;
  }

  if (updatedSource) {
    ctx.AST = null;
    prevFilePath = ctx.filePath;
    ctx.filePath = filePath;
    prevSource = ctx.source;
    ctx.source = updatedSource;
  }

  return {
    resolvedNode,
    prevPath,
    prevFilePath,
    prevSource,
  };
}

function onNodeExit(nodeContext, ctx) {
  if (nodeContext.prevPath) {
    const fromStack = ctx.pathStack.pop();
    ctx.path = fromStack.path;
  }
  if (nodeContext.prevFilePath) {
    ctx.AST = null;
    ctx.source = nodeContext.prevSource;
    ctx.filePath = nodeContext.prevFilePath;
  }
}

function traverseNode(node, definition, ctx) {
  if (!node || !definition) return;
  const nodeContext = onNodeEnter(node, ctx);
  const currentPath = `${ctx.filePath}::${ctx.path.join('/')}`;

  // TO-DO: refactor ctx.visited into dictionary for O(1) check time
  if (ctx.visited.includes(currentPath)) {
    onNodeExit(nodeContext, ctx);
    return;
  }
  ctx.visited.push(currentPath);


  // console.log(`${ctx.filePath}::${currentPath}`);

  if (Array.isArray(nodeContext.resolvedNode)) {
    nodeContext.resolvedNode.forEach((nodeChild, i) => {
      ctx.path.push(i);
      traverseNode(nodeChild, definition, ctx);
      ctx.path.pop();
    });
    if (nodeContext.nextPath) ctx.path = nodeContext.prevPath;
  } else {
    validateNode(nodeContext.resolvedNode, definition, ctx);
    traverseChildren(nodeContext.resolvedNode, definition, ctx);
  }

  onNodeExit(nodeContext, ctx);
}

const traverse = (node, definition, sourceFile, filePath = '', options) => {
  const ctx = {
    document: node,
    filePath,
    path: [],
    visited: [],
    result: [],
    pathStack: [],
    source: sourceFile,
    enableCodeframe: options && options.enableCodeframe ? options.enableCodeframe : false,
  };
  traverseNode(node, definition, ctx);
  return ctx.result;
};

export default traverse;
