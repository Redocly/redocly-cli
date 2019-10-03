import fs from 'fs';
import { getLocationByPath, getCodeFrameForLocation } from '../yaml';

export const messageLevels = {
  ERROR: 4,
  WARNING: 3,
  INFO: 2,
  DEBUG: 1,
};

const getLocationForPath = (fName, path, target) => {
  const fContent = fs.readFileSync(fName, 'utf-8');
  const tempCtx = { source: fContent };
  const location = getLocationByPath(Array.from(path), tempCtx, target);
  return location.startLine;
};

const createError = (msg, node, ctx, options) => {
  const { 
    target, severity = messageLevels.ERROR, possibleAlternate, fromRule,
  } = options;

  let location = getLocationByPath(Array.from(ctx.path), ctx, target);
  if (!location) location = getLocationByPath(Array.from(ctx.path), ctx);

  return {
    message: msg,
    path: Array.from(ctx.path),
    pathStack: ctx.pathStack.map((el) => {
      const startLine = getLocationForPath(el.file, el.path, target);
      return {
        file: el.file,
        startLine,
        path: Array.from(el.path),
      };
    }),
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
    file: ctx.filePath,
    severity,
    enableCodeframe: ctx.enableCodeframe,
    possibleAlternate,
    fromRule,
    target,
  };
};

export const fromError = (error, ctx) => {
  let location = getLocationByPath(Array.from(ctx.path), ctx, error.target);
  if (!location) location = getLocationByPath(Array.from(ctx.path), ctx);
  return {
    ...error,
    ...ctx,
    path: error.path,
    pathStack: ctx.pathStack.map((el) => {
      const startLine = getLocationForPath(el.file, el.path, error.target);
      return {
        file: el.file,
        startLine,
        path: Array.from(el.path),
      };
    }),
  };
};

export default createError;
