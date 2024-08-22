export default function plugin() {
  return {
    id: 'local',
    assertions: {
      checkSchema: (_, opts, ctx) => {
        const name = opts.required;

        const rawValue = ctx.rawValue;
        const errors = [];

        if (Array.isArray(rawValue?.required) && rawValue?.properties) {
          const required = rawValue?.required;
          const properties = rawValue?.properties;

          for (const item of required) {
            if (properties[item] && properties[item].type === 'string') {
              if (!properties[item][name]) {
                errors.push({
                  message: `Required property ${name} inside ${item} string property`,
                  location: ctx.baseLocation,
                });
              }
            }
          }
        }
        return errors;
      },
    },
  };
}
