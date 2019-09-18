import { getLocationByPath } from './yaml';

const createError = (msg, node, ctx) => ({
  message: msg,
  path: ctx.path.join('/'),
  pathStack: ctx.pathStack.map((el) => el.join('/')),
  location: getLocationByPath(Array.from(ctx.path), ctx),
  value: node,
  severity: 'ERROR',
});

export default createError;
