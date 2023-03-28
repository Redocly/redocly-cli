const requiredKeySet = new Set();

module.exports = {
  id: 'local',
  assertions: {
    checkSchema: (_, opts, assertionContext) => {
      const name = opts.required;

      const rawValue = assertionContext.rawValue;
      const ctx = assertionContext.ctx;

      if (rawValue?.required) {
        for (const requiredKey of rawValue?.required) {
          requiredKeySet.add(requiredKey);
        }
      }

      if (rawValue?.type === 'string' && requiredKeySet.has(ctx.key)) {
        if (!rawValue[name]) {
          requiredKeySet.delete(ctx.key);
          return [
            {
              message: `Required property ${name} for type string`,
              location: assertionContext.baseLocation,
            },
          ];
        }
      }

      return [];
    },
  },
};
