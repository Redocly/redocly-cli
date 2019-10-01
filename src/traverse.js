/* eslint-disable no-use-before-define */
import resolveNode from './resolver';

function traverseChildren(resolvedNode, definition, ctx, visited) {
  let nodeChildren;
  switch (typeof definition.properties) {
    case 'function':
      nodeChildren = definition.properties(resolvedNode);
      Object.keys(nodeChildren).forEach((child) => {
        if (Object.keys(resolvedNode).includes(child)) {
          ctx.path.push(child);
          if (resolvedNode[child]) traverseNode(resolvedNode[child], nodeChildren[child], ctx, visited);
          ctx.path.pop();
        }
      });

      break;
    case 'object':
      Object.keys(definition.properties).forEach((p) => {
        ctx.path.push(p);
        if (typeof definition.properties[p] === 'function') {
          if (resolvedNode[p]) traverseNode(resolvedNode[p], definition.properties[p](), ctx, visited);
        } else if (resolvedNode[p]) {
          traverseNode(resolvedNode[p], definition.properties[p], ctx, visited);
        }
        ctx.path.pop();
      });

      break;
    default:
        // do nothing
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

const nestedIncludes = (c, s) => {
  const res = s.find((el) => el.filter((v, id) => c[id] === v).length === c.length) !== undefined;
  // console.log(c, s, res);
  return res;
};

function traverseNode(node, definition, ctx, visited = []) {
  if (!node || !definition) return;

  const nodeContext = onNodeEnter(node, ctx);
  const isRecursive = nestedIncludes(ctx.path, visited);

  // const currentPath = `${ctx.filePath}::${ctx.path.join('/')}`;

  const localVisited = Array.from(visited);
  localVisited.push(Array.from(ctx.path));

  if (Array.isArray(nodeContext.resolvedNode)) {
    nodeContext.resolvedNode.forEach((nodeChild, i) => {
      ctx.path.push(i);
      traverseNode(nodeChild, definition, ctx, localVisited);
      ctx.path.pop();
    });
    if (nodeContext.nextPath) ctx.path = nodeContext.prevPath;
  } else {
    ctx.customRules.forEach((rule) => {
      const errorsOnEnterForType = rule[definition.name] && rule[definition.name]().onEnter
        ? rule[definition.name]().onEnter(
          nodeContext.resolvedNode, definition, { ...ctx }, node,
        ) : [];

      const errorsOnEnterGeneric = rule.any && rule.any().onEnter
        ? rule.any().onEnter(nodeContext.resolvedNode, definition, { ...ctx }, node) : [];

      if (errorsOnEnterForType) ctx.result.push(...errorsOnEnterForType);
      if (errorsOnEnterGeneric) ctx.result.push(...errorsOnEnterGeneric);
    });

    if (!isRecursive) {
      // console.log(`Will traverse ${currentPath}`);
      traverseChildren(nodeContext.resolvedNode, definition, ctx, localVisited);
    }

    // can use async / promises here
    ctx.customRules.forEach((rule) => {
      const errorsOnExitForType = rule[definition.name] && rule[definition.name]().onExit
        ? rule[definition.name]().onExit(nodeContext.resolvedNode, definition, ctx) : [];

      const errorsOnExitGeneric = rule.any && rule.any().onExit
        ? rule.any().onExit(nodeContext.resolvedNode, definition, { ...ctx }, node) : [];

      if (errorsOnExitForType) ctx.result.push(...errorsOnExitForType);
      if (errorsOnExitGeneric) ctx.result.push(...errorsOnExitGeneric);
    });
  }
  onNodeExit(nodeContext, ctx);
}

export default traverseNode;
