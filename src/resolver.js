import fs from 'fs';
import yaml from 'js-yaml';
import { resolve as resolveFile, dirname } from 'path';
import { XMLHttpRequest } from 'xmlhttprequest';

import createError from './error';
import { isUrl } from './utils';

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
const resolve = (link, ctx) => {
  const linkSplitted = link.split('#/');
  if (linkSplitted[0] === '') linkSplitted[0] = ctx.filePath;
  const [filePath, docPath] = linkSplitted;
  let resolvedFilePath = resolveFile(dirname(ctx.filePath), filePath);

  if (isUrl(filePath) && !fs.existsSync(resolvedFilePath)) {
    resolvedFilePath = filePath;
  }

  let document;
  let source;

  const isCurrentDocument = resolvedFilePath === ctx.filePath;
  if (!isCurrentDocument) {
    if (ctx.resolveCache[resolvedFilePath]) {
      ({ source, document } = ctx.resolveCache[resolvedFilePath]);
    } else if (fs.existsSync(resolvedFilePath)) {
      source = fs.readFileSync(resolvedFilePath, 'utf-8');
      document = yaml.safeLoad(source);
      // FIXME: lost yaml parsing and file read errors here
    } else if (isUrl(resolvedFilePath)) {
      try {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', filePath, false);
        xhr.send();

        if (xhr.status !== 200) {
          return null;
        }

        source = xhr.responseText;
        document = yaml.safeLoad(source);
        resolvedFilePath = filePath;
      } catch (e) {
        // FIXME: lost yaml parsing errors and network errors here
        return null;
      }
    } else {
      return null;
    }
  } else {
    document = ctx.document;
  }

  if (source) ctx.resolveCache[resolvedFilePath] = { source, document };

  let target = document;
  if (docPath) {
    const steps = docPath.split('/').filter((el) => el !== '');
    Object.keys(steps).forEach((step) => {
      target = target && steps[step] && target[steps[step]] ? target[steps[step]] : null;
    });
  }

  return {
    node: target,
    updatedSource: !isCurrentDocument ? source : null,
    updatedDocument: !isCurrentDocument ? document : null,
    docPath: docPath ? docPath.split('/') : [],
    filePath: resolvedFilePath || null,
  };
};


/*
 * This function is used to resolve $ref fields inside the node. Currently supports links:
 * - inside the file
 * - to the another file in local file system
 * - http(s) links to other files
 *
 * $ref field value must be a valid OpenAPI link (e.g. another/dir/file.yaml#/components/schemas/Example)
 *
 * @param {*} node
 * @param {*} ctx
 */
const resolveNode = (node, ctx) => {
  if (!node || typeof node !== 'object') return { node, nextPath: null };
  let nextPath;
  let resolved = {
    node,
  };
  Object.keys(node).forEach((p) => {
    if (p === '$ref') {
      resolved = resolve(node[p], ctx);
      if (resolved && resolved.node) {
        nextPath = resolved.docPath;
      } else {
        ctx.path.push('$ref');
        ctx.result.push(createError('Reference does not exist.', node, ctx, { fromRule: 'resolve-ref' }));
        ctx.path.pop();
        resolved = {};
        resolved.node = node;
        nextPath = null;
        resolved.updatedSource = null;
        resolved.filePath = null;
      }
    }
  });
  return {
    node: resolved.node,
    nextPath,
    updatedSource: resolved.updatedSource,
    updatedDocument: resolved.updatedDocument,
    filePath: resolved.filePath,
  };
};

export default resolveNode;
