import fs from 'fs';
import { getLocationByPath, getCodeFrameForLocation } from '../yaml';
import {
  outputLightBlue, outputBgRed, outputGrey, outputBgYellow, outputRed, outputBgLightBlue,
} from '../utils';

export const messageLevels = {
  ERROR: 4,
  WARNING: 3,
  INFO: 2,
  DEBUG: 1,
};

const colorizeMessageHeader = (msg) => {
  const msgHeader = `${msg.file}:${msg.location.startLine}:${msg.location.startCol}`;
  switch (msg.severity) {
    case messageLevels.ERROR:
      return outputBgRed(msgHeader);
    case messageLevels.WARNING:
      return outputRed(outputBgYellow(msgHeader));
    case messageLevels.INFO:
      return outputBgLightBlue(msgHeader);
    default:
      return msgHeader;
  }
};

const prettyPrint = (error, enableCodeframe) => {
  const message = `${colorizeMessageHeader(error)} ${outputGrey(`at #/${error.path}`)}`
  + `${error.pathStack.length ? `\n  from ${error.pathStack.reverse().join('\n  from ')}\n` : '\n'}`
  + `\n${error.message}\n`
  + `${enableCodeframe ? `\n${error.codeFrame}\n` : ''}`
  + '\n\n';
  return message;
};

const pathImproveReadability = (path) => path.map((el) => (el[0] === '/' ? outputGrey('[\'') + outputLightBlue(el) + outputGrey('\']') : outputGrey(el)));

const getLocationForPath = (fName, path, target) => {
  const fContent = fs.readFileSync(fName, 'utf-8');
  const tempCtx = { source: fContent };
  const location = getLocationByPath(Array.from(path), tempCtx, target);
  return location.startLine;
};

const createError = (msg, node, ctx, target, severity = messageLevels.ERROR) => {
  let location = getLocationByPath(Array.from(ctx.path), ctx, target);
  if (!location) location = getLocationByPath(Array.from(ctx.path), ctx);
  const body = {
    message: msg,
    path: pathImproveReadability(ctx.path).join(outputGrey('/')),
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
    severity,
  };
  return {
    ...body,
    prettyPrint: () => prettyPrint(body, ctx.enableCodeframe),
  };
};

export default createError;
