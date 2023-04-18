module.exports = ResolveX;

function ResolveX() {
  return {
    Info: {
      leave(info, ctx) {
        const xAttribute = ctx.resolve(info['x-attributes'][0]).node;
        info['x-attributes'][0].resolved = xAttribute;

        const testAttribute = ctx.resolve(info['test-attributes'][0]).node;
        info['test-attributes'][0].resolved = testAttribute;
      },
    },
  };
}
