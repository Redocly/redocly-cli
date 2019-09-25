import fs from 'fs';
import yaml from 'js-yaml';
import createError from './error';

/**
 *
 * Here we go over each of the steps in the link and try to retreive the value
 * for it. If failed (e.g. because of undefined value) -- return null, to indicate that such
 * reference does not exist.
 *
 * @param {string} link A path in the yaml document which is to be resolved
 * @param {*} ctx JSON Object with the document field which represents the YAML structure
 */
const resolve = (link, ctx) => {
  const linkSplitted = link.split('#/');
  const [filePath, docPath] = linkSplitted;
  let fullFileName;

  let target;
  let fData;
  if (filePath) {
    const path = ctx.filePath.substring(0, Math.max(ctx.filePath.lastIndexOf('/'), ctx.filePath.lastIndexOf('\\')));
    fullFileName = path ? `${path}/${filePath}` : filePath;
    fData = fs.readFileSync(fullFileName, 'utf-8');
    target = yaml.safeLoad(fData);
  } else {
    target = ctx.document;
  }

  if (docPath) {
    const steps = docPath.split('/').filter((el) => el !== '');
    Object.keys(steps).forEach((step) => {
      target = target && steps[step] && target[steps[step]] ? target[steps[step]] : null;
    });
  }

  return {
    node: target,
    updatedSource: filePath ? fData : null,
    docPath: docPath ? docPath.split('/') : [],
    filePath: fullFileName || null,
  };
};

const resolveNode = (node, ctx) => {
  if (!node || typeof node !== 'object') return { node, nextPath: null };
  let nextPath;
  let resolved = {
    node,
  };
  Object.keys(node).forEach((p) => {
    if (p === '$ref') {
      resolved = resolve(node[p], ctx);
      nextPath = resolved.docPath;
      if (!resolved.node) {
        ctx.path.push('$ref');
        ctx.result.push(createError('Refernce does not exist', node, ctx));
        ctx.path.pop();
        resolved.node = node;
        nextPath = null;
        resolved.updatedSource = null;
      }
    }
  });
  return {
    node: resolved.node,
    nextPath,
    updatedSource: resolved.updatedSource,
    filePath: resolved.filePath,
  };
};

export default resolveNode;
