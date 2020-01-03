import path from 'path';
import { getLocationByPath, getCodeFrameForLocation } from '../yaml';

export const messageLevels = {
  ERROR: 4,
  WARNING: 3,
  INFO: 2,
  DEBUG: 1,
};

const getLocationForPath = (fName, nodePath, target, { filePath, source }) => getLocationByPath(
  Array.from(nodePath),
  { filePath, source },
  target,
).startLine;

export const getMsgLevelFromString = (severityString) => {
  switch (severityString.toLowerCase()) {
    case 'debug':
      return 1;
    case 'info':
      return 2;
    case 'warning':
      return 3;
    case 'error':
    default:
      return 4;
  }
};

const getReferencedFrom = (ctx) => {
  const lastRef = ctx.pathStack[ctx.pathStack.length - 1];
  return {
    file: path.relative(process.cwd(), lastRef.file),
    startLine: getLocationForPath(
      lastRef.file,
      [...lastRef.path, '$ref'],
      'key',
      { source: lastRef.source, filePath: lastRef.file },
    ),
    path: Array.from(lastRef.path),
  };
};

const createError = (msg, node, ctx, options) => {
  const {
    target, possibleAlternate, fromRule,
  } = options;

  let { severity = messageLevels.ERROR } = options;

  if (typeof severity === 'string') {
    severity = getMsgLevelFromString(severity);
  }

  let location = getLocationByPath(Array.from(ctx.path), ctx, target);
  if (!location) location = getLocationByPath(Array.from(ctx.path), ctx);

  return {
    message: msg,
    path: Array.from(ctx.path),
    referencedFrom: getReferencedFrom(ctx),
    location,
    codeFrame: ctx.enableCodeframe && location
      ? getCodeFrameForLocation(
        location.startIndex,
        location.endIndex,
        ctx.source,
        location.startLine,
      )
      : null,
    value: node,
    file: path.relative(process.cwd(), ctx.filePath),
    severity,
    enableCodeframe: ctx.enableCodeframe,
    possibleAlternate,
    fromRule,
    target,
  };
};

export const createErrorFlat = (
  node, ctx, fromRule, severity, msg, target, possibleAlternate,
) => createError(msg, node, ctx, {
  target, fromRule, severity, possibleAlternate,
});

export const fromError = (error, ctx) => (
  // let location = getLocationByPath(Array.from(ctx.path), ctx, error.target);
  // if (!location) location = getLocationByPath(Array.from(ctx.path), ctx);
  {
    ...error,
    ...ctx,
    document: null,
    source: null,
    path: error.path,
    referencedFrom: getReferencedFrom(ctx),
  }
);

export default createError;
