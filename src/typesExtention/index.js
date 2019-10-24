import { existsSync } from 'fs';

export default (definition, ctx) => {
  if (!ctx.config.typeExtension && typeof definition !== 'string') return definition;

  const definitionName = typeof definition === 'string' ? definition : definition.name;

  const extension = ctx.config.typeExtension[definitionName];
  if (!extension) {
    return definition;
  }
  const alteredFields = Object.keys(extension.properties);

  for (let i = 0; i < alteredFields.length; i++) {
    const pathToDefaultType = `${__dirname}/../types/${extension.properties[alteredFields[i]]}.js`;
    let alteredType;
    alteredType = ctx.config.typeExtension[extension.properties[alteredFields[i]]];

    if (alteredType === undefined && existsSync(pathToDefaultType)) {
      alteredType = require(pathToDefaultType).default;
    }
    extension.properties[alteredFields[i]] = alteredType;
  }

  return {
    ...definition,
    properties: {
      ...definition.properties,
      ...extension.properties,
    },
  };
};
