/* eslint-disable no-use-before-define */
import resolveNode from './resolver';

function traverseChildren(resolvedNode, definition, ctx) {
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

  // console.log(`${ctx.filePath}::${currentPath}`);

  if (Array.isArray(nodeContext.resolvedNode)) {
    nodeContext.resolvedNode.forEach((nodeChild, i) => {
      ctx.path.push(i);
      traverseNode(nodeChild, definition, ctx);
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

    // TO-DO: refactor ctx.visited into dictionary for O(1) check time
    if (!ctx.visited.includes(currentPath)) {
      ctx.visited.push(currentPath);
      traverseChildren(nodeContext.resolvedNode, definition, ctx);
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
