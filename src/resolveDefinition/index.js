import { existsSync } from 'fs';

const loadDefaultDefinition = (name) => {
  const pathToDefaultType = `${__dirname}/../types/${name}.js`;
  return existsSync(pathToDefaultType) ? require(pathToDefaultType).default : {};
};

export default (definition, ctx, node) => {
  if (!ctx.config.definitionResolver && typeof definition !== 'string') return definition;

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

  return resolvedDefinition;
};
