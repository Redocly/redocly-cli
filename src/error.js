import { getLocationByPath, getCodeFrameForLocation } from './yaml';

const prettyPrintError = (error) => {
  const message = `${error.location.startLine}:${error.location.startCol}`
  + ' Following error occured:\n'
  + `${error.message} by path ${error.path}\n`
  + `${error.pathStack.length ? `path stack is ${error.pathStack}` : ''}\n`
  + `${error.codeFrame}`;
  return message;
};

const createError = (msg, node, ctx, target) => {
  const location = getLocationByPath(Array.from(ctx.path), ctx, target);
  const body = {
    message: msg,
    path: ctx.path.join('/'),
    pathStack: ctx.pathStack.map((el) => el.join('/')),
    location,
    codeFrame: getCodeFrameForLocation(location.startIndex, location.endIndex, ctx.source),
    value: node,
    severity: 'ERROR',
  };
  return {
    ...body,
    prettyPrint: () => prettyPrintError(body),
  };
};

export default createError;
