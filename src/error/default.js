import { getLocationByPath, getCodeFrameForLocation } from '../yaml';

const prettyPrintError = (error, enableCodeframe) => {
  const message = `${error.location.startLine}:${error.location.startCol}`
  + ' Following error occured:\n'
  + `${error.message} by path ${error.path}${error.file ? ` in file ${error.file}` : ''}\n`
  + `${error.pathStack.length ? '\nError traced by following path:\n' : ''}`
  + `${error.pathStack.length ? `${error.pathStack.join('\n')}\n` : ''}`
  + `${enableCodeframe ? `\n${error.codeFrame}\n` : ''}`;
  return message;
};

const createError = (msg, node, ctx, target) => {
  const location = getLocationByPath(Array.from(ctx.path), ctx, target);
  const body = {
    message: msg,
    path: ctx.path.join('/'),
    pathStack: ctx.pathStack.map((el) => el.join('/')),
    location,
    codeFrame: ctx.enableCodeframe
      ? getCodeFrameForLocation(location.startIndex, location.endIndex, ctx.source) : null,
    value: node,
    file: ctx.filePath,
    severity: 'ERROR',
  };
  return {
    ...body,
    prettyPrint: () => prettyPrintError(body, ctx.enableCodeframe),
  };
};

export default createError;
