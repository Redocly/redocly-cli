import fs from 'fs';
import { getLocationByPath, getCodeFrameForLocation } from '../yaml';
import { outputLightBlue, outputBgRed, outputGrey } from '../utils';

const prettyPrintError = (error, enableCodeframe) => {
  const message = `${outputBgRed(`${error.file}:${error.location.startLine}:${error.location.startCol}`)}`
  + ` ${outputGrey(`at ${error.path}`)}`
  + `\n${error.message}\n`
  + `\nat ${outputLightBlue(`${error.file}:${error.location.startLine}:${error.location.startCol}`)} ${outputGrey(`at ${error.path}`)}`
  + `${error.pathStack.length ? `\nat ${error.pathStack.reverse().join('\nat ')}\n` : '\n'}`
  + `${enableCodeframe ? `\n${error.codeFrame}\n` : ''}`;
  return message;
};

const pathImproveReadability = (path) => path.map((el) => (el[0] === '/' ? outputGrey('[\'') + outputLightBlue(el) + outputGrey('\']') : el));

const getLocationForPath = (fName, path, target) => {
  const fContent = fs.readFileSync(fName, 'utf-8');
  const tempCtx = { source: fContent };
  const location = getLocationByPath(Array.from(path), tempCtx, target);
  return location.startLine;
};

const createError = (msg, node, ctx, target) => {
  let location = getLocationByPath(Array.from(ctx.path), ctx, target);
  if (!location) location = getLocationByPath(Array.from(ctx.path), ctx);
  const body = {
    message: msg,
    path: pathImproveReadability(ctx.path).join('/'),
    pathStack: ctx.pathStack.map((el) => {
      const startLine = getLocationForPath(el.file, el.path, target);
      return `${outputLightBlue(`${el.file}:${startLine}`)} ${outputGrey(`#/${el.path.join('/')}`)}`;
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
    severity: 'ERROR',
  };
  return {
    ...body,
    prettyPrint: () => prettyPrintError(body, ctx.enableCodeframe),
  };
};

export default createError;
