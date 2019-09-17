const createError = (msg, node, ctx) => ({
  message: msg,
  path: `/${ctx.path.join('/')}`,
  pathStack: ctx.pathStack.map((el) => el.join('/')),
  value: node,
  severity: 'ERROR',
});

export default createError;
