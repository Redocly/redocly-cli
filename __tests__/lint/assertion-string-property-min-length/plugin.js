module.exports = {
  id: 'local',
  assertions: {
    checkSchema: (_, opts, assertionContext) => {
      const name = opts.required;

      const rawValue = assertionContext.rawValue;
      const errors = [];

      if (rawValue?.required && rawValue?.properties) {
        const required = rawValue?.required;
        const properties = rawValue?.properties;

        for (const item of required) {
          if (properties[item] && properties[item].type === 'string') {
            if (!properties[item][name]) {
              errors.push({
                message: `Required property ${name} inside ${item} string property`,
                location: assertionContext.baseLocation,
              });
            }
          }
        }
      }
      return errors;
    },
  },
};
