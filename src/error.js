import { getLocationByPath, getCodeFrameForLocation } from './yaml';

const prettyPrintError = (error) => {
  const message = `${error.location.startLine}:${error.location.startCol}`
  + ' Following error occured:\n'
  + `${error.message} by path ${error.path}\n`
  + `${error.codeFrame ? `${error.codeFrame}\n` : ''}`
  + `${error.pathStack.length ? '\nError traced by following path:\n' : ''}`
  + `${error.pathStack.length ? error.pathStack.join('\n') : ''}\n`;
  return message;
};

const createError = (msg, node, ctx, target) => {
  const location = getLocationByPath(Array.from(ctx.path), ctx, target);
  const body = {
    message: msg,
    path: ctx.path.join('/'),
    pathStack: ctx.pathStack.map((el) => el.join('/')),
    location,
    codeFrame: ctx.enableCodeframe ? getCodeFrameForLocation(location.startIndex, location.endIndex, ctx.source) : null,
    value: node,
    severity: 'ERROR',
  };
  return {
    ...body,
    prettyPrint: () => prettyPrintError(body),
  };
};

export default createError;
