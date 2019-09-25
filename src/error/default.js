import { getLocationByPath, getCodeFrameForLocation } from '../yaml';
import { outputLightBlue, outputBgRed } from '../utils';

const prettyPrintError = (error, enableCodeframe) => {
  const message = `${outputBgRed(`${error.file}:${error.location.startLine}:${error.location.startCol}`)}`
  + `\n${error.message} by path ${outputLightBlue(`#/${error.path}`)}\n`
  + `${error.pathStack.length ? '\nError referenced from:' : ''}`
  + `${error.pathStack.length ? outputLightBlue(`\n- #/${error.pathStack.join('\n- #/')}\n`) : ''}`
  + `${enableCodeframe ? `\n${error.codeFrame}\n` : ''}`;
  return message;
};

const createError = (msg, node, ctx, target) => {
  let location = getLocationByPath(Array.from(ctx.path), ctx, target);
  if (!location) location = getLocationByPath(Array.from(ctx.path), ctx);
  const body = {
    message: msg,
    path: ctx.path.join('/'),
    pathStack: ctx.pathStack.map((el) => el.join('/')),
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
    severity: 'ERROR',
  };
  return {
    ...body,
    prettyPrint: () => prettyPrintError(body, ctx.enableCodeframe),
  };
};

export default createError;
