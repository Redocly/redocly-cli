/* eslint-disable no-param-reassign */
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

export const getReferencedFrom = (ctx) => {
  const lastRef = ctx.pathStack[ctx.pathStack.length - 1];
  if (!lastRef) return null;
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

const createError = (msg, node, ctx, options, overrideSeverity) => {
  const {
    target, possibleAlternate, fromRule,
  } = options;

  let { severity = messageLevels.ERROR } = options;

  if (overrideSeverity) severity = overrideSeverity;

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
  node, ctx, fromRule, severity, msg, target, possibleAlternate, overrideSeverity,
) => createError(msg, node, ctx, {
  target, fromRule, severity, possibleAlternate,
}, overrideSeverity);

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

export const reportFlat = (node, ctx, fromRule, severity, options) => {
  const { possibleAlternate, overrideSeverity, message } = options;
  let { locations: rawLocations, reportOnKey } = options;

  reportOnKey = reportOnKey || false;

  if (overrideSeverity) severity = overrideSeverity;

  if (!rawLocations) {
    rawLocations = [{
      path: ctx.path,
      reportOnKey,
    }];
  }

  rawLocations = rawLocations.map((rL) => ({
    path: ctx.path,
    ...rL,
  }));

  if (typeof severity === 'string') {
    severity = getMsgLevelFromString(severity);
  }

  const locations = [];

  for (const rawLocation of rawLocations) {
    let location = getLocationByPath(Array.from(rawLocation.path), ctx, rawLocation.reportOnKey ? 'key' : 'value');
    if (!location) location = getLocationByPath(Array.from(rawLocation.path), ctx);
    locations.push(location);
  }

  if (locations.length === 0) {
    throw new Error('Location must be provided in the "report" call.');
  }

  // TODO: add support of multiple locations of the validation result
  ctx.result.push({
    message,
    path: Array.from(ctx.path),
    referencedFrom: getReferencedFrom(ctx),
    location: locations[0],
    codeFrame: ctx.enableCodeframe && locations[0]
      ? getCodeFrameForLocation(
        locations[0].startIndex,
        locations[0].endIndex,
        ctx.source,
        locations[0].startLine,
      )
      : null,
    value: node,
    file: path.relative(process.cwd(), ctx.filePath),
    severity,
    enableCodeframe: ctx.enableCodeframe,
    possibleAlternate,
    fromRule,
    target: rawLocations[0].reportOnKey ? 'key' : 'value',
  });
};

export default createError;
