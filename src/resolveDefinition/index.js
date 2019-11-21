import { existsSync } from 'fs';

const loadDefaultDefinition = (name) => {
  const pathToDefaultType = `${__dirname}/../types/${name}.js`;
  return existsSync(pathToDefaultType) ? require(pathToDefaultType).default : {};
};

export default (definition, ctx, node) => {
  if (!ctx.config.typeExtension && typeof definition !== 'string') return definition;

  const definitionName = typeof definition === 'string' ? definition : definition.name;
  const defaultDefinition = loadDefaultDefinition(definitionName);

  let resolvedDefinition = ctx.config.definitionResolver(definitionName, defaultDefinition);

  resolvedDefinition = (
    resolvedDefinition
    && resolvedDefinition.resolveType
    && resolvedDefinition.resolveType(node) !== resolvedDefinition.name
  )
    ? ctx.config.definitionResolver(resolvedDefinition.resolveType(node), resolvedDefinition)
    : resolvedDefinition;

  // if (resolvedDefinition.name === 'OpenAPIParameterWithAllOf') {
  //   console.log('111111');
  //   console.log(definition);
  //   console.log(defaultDefinition);
  //   console.log(resolvedDefinition);
  //   console.log('22222');
  // }

  // if (!resolvedDefinition) {
  //   console.log(resolvedDefinition);
  //   console.log(definition);
  //   console.log(defaultDefinition);
  //   console.log(`${__dirname}/../types/${definition.name}.js`);
  // }
  return resolvedDefinition;
};
