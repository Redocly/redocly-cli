import { getLocationByPath, getCodeFrameForLocation } from './yaml';

const createError = (msg, node, ctx) => {
  const location = getLocationByPath(Array.from(ctx.path), ctx);
  return {
    message: msg,
    path: ctx.path.join('/'),
    pathStack: ctx.pathStack.map((el) => el.join('/')),
    location,
    codeFrame: getCodeFrameForLocation(location.startIndex, location.endIndex, ctx.source),
    value: node,
    severity: 'ERROR',
  };
};

export default createError;
