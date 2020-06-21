export const id = 'local';

export const rules = {
  oas3: {
    'paths-kebab-case': () => {
      return {
        PathItem(_path, { report, key }) {
          const segments = key.substr(1).split('/');
          if (
            !segments.every((segment) => /^{.+}$/.test(segment) && /[a-z0-9-_.]+/.test(segment))
          ) {
            report({
              message: `${key} is not kebab-case`,
              location: { reportOnKey: true },
            });
          }
        },
      };
    },
    'boolean-parameter-prefixes': () => {
      return {
        Parameter: {
          Schema(schema, { report, parentLocations }, parents) {
            if (schema.type === 'boolean' && !/^(is|has)[A-Z]/.test(parents.Parameter.name)) {
              report({
                message: `Boolean parameter ${parents.Parameter.name} should have a \`is\` or \`has\` prefix`,
                location: parentLocations.Parameter.append(['name']),
              });
            }
          },
        },
      };
    },
  },
};

/** @type {import('../src/config/config').TransformersConfig} */
export const transformers = {
  oas3: {
    'duplicate-description': () => {
      return {
        Info(info) {
          if (info.description) {
            info.description = info.description + '\n' + info.description
          }
        }
      }
    }
  }
}

export const configs = {
  all: {
    rules: {
      'local/paths-kebab-case': 'error',
      'local/boolean-parameter-prefixes': 'error',
    },
  },
};
