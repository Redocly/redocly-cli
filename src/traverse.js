/* eslint-disable no-await-in-loop */
/* eslint-disable no-underscore-dangle */
/* eslint-disable no-case-declarations */
import path from 'path';

import resolveNode, { popPath } from './resolver';
import resolveDefinition from './resolveDefinition';
import resolveType from './resolveType';
import resolveScalars from './scalarsResolver';

import { fromError, createErrorFlat, reportFlat } from './error/default';

async function traverseChildren(resolvedNode, definition, ctx, visited) {
  let nodeChildren;
  const errors = [];
  switch (typeof definition.properties) {
    case 'function':
      nodeChildren = definition.properties(resolvedNode);
      const childrenNames = Object.keys(nodeChildren);
      const resolvedNodeKeys = Object.keys(resolvedNode);
      for (let i = 0; i < childrenNames.length; i += 1) {
        const child = childrenNames[i];
        let childResult = [];
        if (resolvedNodeKeys.includes(child)) {
          ctx.path.push(child);
          if (resolvedNode[child]) {
            childResult = await traverseNode(resolvedNode[child], nodeChildren[child], ctx, visited);
          }
          if (childResult) errors.push(...childResult);
          ctx.path.pop();
        }
      }

      break;
    case 'object':
      const props = Object.keys(definition.properties);
      for (let i = 0; i < props.length; i += 1) {
        const p = props[i];
        let propResult = [];
        ctx.path.push(p);
        if (typeof definition.properties[p] === 'function') {
          if (resolvedNode[p]) {
            propResult = await traverseNode(resolvedNode[p], definition.properties[p](resolvedNode[p]), ctx, visited);
          }
        } else if (resolvedNode[p]) {
          propResult = await traverseNode(resolvedNode[p], definition.properties[p], ctx, visited);
        }
        if (propResult) errors.push(...propResult);
        ctx.path.pop();
      }

      break;
    default:
        // do nothing
  }
  return errors;
}

async function onNodeEnter(node, ctx) {
  const {
    node: resolvedNode, onStack,
  } = await resolveNode(node, ctx);

  return {
    resolvedNode,
    onStack,
  };
}

function onNodeExit(nodeContext, ctx) {
  if (nodeContext.onStack) {
    popPath(ctx);
  }
}

const nestedIncludes = (c, s) => {
  const res = s.find((el) => el === s) !== undefined;
  return res;
};


async function traverseNode(node, definition, ctx, visited = []) {
  if (!node || !definition) return [];

  const nodeContext = await onNodeEnter(node, ctx);
  const isRecursive = nestedIncludes(ctx.path, visited);
  const errors = [];
  const currentPath = `${path.relative(process.cwd(), ctx.filePath)}::${ctx.path.join('/')}`;

  const localVisited = Array.from(visited);
  localVisited.push(currentPath);

  const resolvedDefinition = resolveDefinition(definition, ctx, nodeContext.resolvedNode);

  ctx.definitionStack.push(resolvedDefinition);
  resolveScalars(nodeContext.resolvedNode, definition, ctx);

  if (definition.customResolveFields) {
    await definition.customResolveFields(nodeContext.resolvedNode, ctx, visited);
  }

  if (Array.isArray(nodeContext.resolvedNode)) {
    for (let i = 0; i < nodeContext.resolvedNode.length; i++) {
      ctx.path.push(i);
      const arrayResult = await traverseNode(nodeContext.resolvedNode[i], resolvedDefinition, ctx, localVisited);
      if (arrayResult) errors.push(...arrayResult);
      ctx.path.pop();
    }
  } else {
    ctx.validateFields = ctx.validateFieldsRaw.bind(
      null, nodeContext.resolvedNode, ctx,
    );
    await runRuleOnRuleset(nodeContext, 'enter', ctx, resolvedDefinition, node, errors, localVisited);

    const newNode = !isRecursive
      && (!resolvedDefinition.isIdempotent || !ctx.visited.includes(currentPath));
    if (newNode) {
      if (!ctx.visited.includes(currentPath)) ctx.visited.push(currentPath);

      const errorsChildren = await traverseChildren(
        nodeContext.resolvedNode, resolvedDefinition, ctx, localVisited,
      );
      errors.push(...errorsChildren);
    } else {
      // Will use cached result if we have already traversed this nodes children
      const cachedResult = ctx.cache[currentPath]
        ? ctx.cache[currentPath].map((r) => fromError(r, ctx))
        : [];

      ctx.result.push(...cachedResult);
    }

    await runRuleOnRuleset(nodeContext, 'exit', ctx, resolvedDefinition, node, errors);
    if (newNode) ctx.cache[currentPath] = errors;
  }
  onNodeExit(nodeContext, ctx);
  ctx.definitionStack.pop();
  return errors;
}

async function runRuleOnRuleset(nodeContext, ruleSuffix, ctx, definition, node, errors, visited) {
  // ctx.customRules = ctx.customRules.filter((r, i) => i === ctx.customRules.length - 1);

  const fName = `${definition.name}_${ruleSuffix}`;

  for (let i = 0; i < ctx.customRules.length; i += 1) {
    ctx.validateFieldsHelper = ctx.validateFields.bind(
      null,
      ctx.customRules[i]._config,
      ctx.customRules[i].constructor.rule,
    );

    ctx.createError = createErrorFlat.bind(
      null,
      nodeContext.resolvedNode,
      ctx,
      ctx.customRules[i].constructor.rule,
      ctx.customRules[i].config
        ? ctx.customRules[i].config.level : ctx.customRules[i]._config.level,
    );

    ctx.report = reportFlat.bind(
      null,
      nodeContext.resolvedNode,
      ctx,
      ctx.customRules[i].constructor.rule,
      ctx.customRules[i].config
        ? ctx.customRules[i].config.level : ctx.customRules[i]._config.level,
    );

    let visitorName = fName;
    const anyVisitorName = ruleSuffix === 'enter' ? 'enter' : 'leave';

    if (ruleSuffix === 'enter') {
      visitorName = ctx.customRules[i][definition.name] ? definition.name : visitorName;
    }

    if (ctx.customRules[i][anyVisitorName]) {
      const errorsOnEnterGeneric = await ctx.customRules[i][anyVisitorName](
        nodeContext.resolvedNode,
        definition,
        ctx,
        node, {
          traverseNode, visited, resolveType,
        },
      );

      if (Array.isArray(errorsOnEnterGeneric)) {
        ctx.result.push(...errorsOnEnterGeneric);
        errors.push(...errorsOnEnterGeneric);
      }
    }


    if (ctx.customRules[i][visitorName]) {
      const errorsOnEnterForType = await ctx.customRules[i][visitorName](
        nodeContext.resolvedNode, definition, ctx, node, { traverseNode, visited, resolveType },
      );

      if (Array.isArray(errorsOnEnterForType)) {
        ctx.result.push(...errorsOnEnterForType);
        errors.push(...errorsOnEnterForType);
      }
    }
  }
}

export default traverseNode;
