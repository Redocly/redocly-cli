import fs from 'fs';

import yaml from 'js-yaml';
import { resolve as resolveFile, dirname } from 'path';
import { resolve as resolveUrl } from 'url';
import { XMLHttpRequest } from 'xmlhttprequest';

import createError, { getReferencedFrom, createYAMLParseError } from './error';
import { isFullyQualifiedUrl } from './utils';

function pushPath(ctx, filePath, docPath) {
  ctx.pathStack.push({
    path: ctx.path, file: ctx.filePath, document: ctx.document, source: ctx.source,
  });

  ctx.path = docPath;
  ctx.filePath = filePath;
}

export function popPath(ctx) {
  const topPath = ctx.pathStack.pop();
  ctx.path = topPath.path;
  ctx.filePath = topPath.file;
  ctx.source = topPath.source;
  ctx.document = topPath.document;
}

/**
 *
 * Here we go over each of the steps in the link and try to retreive the value
 * for it. If failed (e.g. because of undefined value) -- return null, to indicate that such
 * reference does not exist.
 *
 * TODO: we might need a feature to support validation of "URL" based definitions in the future, so
 * would be nice to have opportunity to call resolve() with empty ctx.
 *
 * TODO: add per-file/per-url cache
 *
 * @param {string} link A path in the yaml document which is to be resolved
 * @param {*} ctx JSON Object with the document field which represents the YAML structure
 */
function resolve(link, ctx, visited = []) {
  const linkSplitted = link.split('#/');
  if (linkSplitted[0] === '') linkSplitted[0] = ctx.filePath;
  const [filePath, docPath] = linkSplitted;

  const resolvedFilePath = (isFullyQualifiedUrl(ctx.filePath) || isFullyQualifiedUrl(filePath))
    ? resolveUrl(ctx.filePath, filePath)
    : resolveFile(dirname(ctx.filePath), filePath);

  let document;
  let source;

  const isCurrentDocument = resolvedFilePath === ctx.filePath;

  pushPath(ctx, resolvedFilePath, []);

  const resolvedLink = `${resolvedFilePath}#/${docPath}`;
  // console.log(linkSplitted);
  if (!isCurrentDocument) {
    if (ctx.resolveCache[resolvedFilePath]) {
      ({ source, document } = ctx.resolveCache[resolvedFilePath]);
    } else if (fs.existsSync(resolvedFilePath)) {
      ctx.fileDependencies.add(resolvedFilePath);
      // FIXME: if refernced e.g. md file, no need to parse
      source = fs.readFileSync(resolvedFilePath, 'utf-8');
      try {
        document = yaml.safeLoad(source);
      } catch (e) {
        ctx.result.push(createYAMLParseError(e, ctx, resolvedFilePath));
        return { node: undefined };
      }
      // FIXME: lost yaml parsing and file read errors here
    } else if (isFullyQualifiedUrl(resolvedFilePath)) {
      try {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', resolvedFilePath, false);

        ctx.redoclyClient.processRegistryDependency(resolvedFilePath, ctx);
        for (let i = 0; i < ctx.headers.length; i++) {
          if (ctx.headers[i].regexp.test(resolvedFilePath)) {
            xhr.setRequestHeader(ctx.headers[i].name, ctx.headers[i].value);
          }
        }
        xhr.send();

        if (xhr.status !== 200) {
          return { node: undefined };
        }

        source = xhr.responseText;
        document = yaml.safeLoad(source);
      } catch (e) {
        // FIXME: lost yaml parsing errors and network errors here
        return { node: undefined };
      }
    } else {
      return { node: undefined };
    }
  } else {
    document = ctx.document;
    source = ctx.source;
  }

  if (source) ctx.resolveCache[resolvedFilePath] = { source, document };

  ctx.source = source;
  ctx.document = document;

  const docPathSteps = docPath ? docPath.split('/').filter((el) => el !== '').reverse() : [];

  let target = document;
  let circular;
  let transitiveResolvesOnStack = 0;
  let transitiveError;

  if (visited.indexOf(resolvedLink) > -1) {
    target = undefined;
    circular = true;
  }

  visited.push(resolvedLink);

  while (target !== undefined) {
    if (target && target.$ref) {
      // handle transitive $ref's
      const resolved = resolve(target.$ref, ctx, visited);
      transitiveError = resolved.transitiveError;
      if (resolved.node === undefined && !transitiveError) {
        // We want to show only the error for the first $ref that can't be resolved.
        // So we create it on the current stack and propagate it out as a transitiveError
        popPath(ctx);
        ctx.path.push('$ref');
        const message = resolved.circular ? 'Circular reference.' : 'Reference does not exist.';
        transitiveError = createError(message, target, ctx, { fromRule: 'resolve-ref' });
        ctx.path.pop();
        target = undefined;
        break;
      }
      target = resolved.node;
      transitiveResolvesOnStack++;
    }

    const step = docPathSteps.pop();
    if (!step) break;

    target = target && target[step] !== undefined ? target[step] : undefined;
    ctx.path.push(step);
  }

  for (let i = 0; i < transitiveResolvesOnStack; ++i) {
    // keep current file context and remove indirection records
    ctx.pathStack.pop();
  }

  if (transitiveError) {
    // recalc referencedFrom after exiting transitive ref stack to show original $ref in the error
    transitiveError.referencedFrom = getReferencedFrom(ctx);
  }

  return {
    node: target,
    transitiveError,
    circular,
  };
}


/*
 * This function is used to resolve $ref fields inside the node. Currently supports links:
 * - inside the file
 * - to the another file in local file system
 * - http(s) links to other files
 *
 * $ref field value must be a valid OpenAPI link
 * (e.g. another/dir/file.yaml#/components/schemas/Example)
 *
 * @param {*} node
 * @param {*} ctx
 */
function resolveNode(node, ctx) {
  if (!node || typeof node !== 'object') return { node };

  if (node.$ref) {
    const resolved = resolve(node.$ref, ctx);
    if (resolved.node === undefined) { // can't resolve
      popPath(ctx);

      ctx.path.push('$ref');
      const error = resolved.transitiveError
        ? resolved.transitiveError
        : createError('Reference does not exist.', node, ctx, { fromRule: 'resolve-ref' });
      ctx.path.pop();

      ctx.result.push(error);

      return { node };
    }

    return { node: resolved.node, onStack: true };
  }

  return { node };
}

// to be used in mutators
export function resolveNodeNoSideEffects(node, ctx) {
  const ctxCopy = { ...ctx, pathStack: ctx.pathStack.slice() };
  return resolveNode(node, ctxCopy);
}

export default resolveNode;
