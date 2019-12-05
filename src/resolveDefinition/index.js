import { existsSync, readdirSync } from 'fs';

const loadDefaultDefinitions = () => {
  const defaultDefinitionsMap = {};

  readdirSync(`${__dirname}/../types`)
    .map((fName) => `${__dirname}/../types/${fName}`)
    .forEach((fName) => {
      const definition = existsSync(fName) ? require(fName).default : {};
      defaultDefinitionsMap[definition.name] = definition;
    });

  return defaultDefinitionsMap;
};

const applyMutations = (defaultDefinitionsMap, definitionReducer) => {
  const mutatedDefinitionsMap = definitionReducer(defaultDefinitionsMap);
  return mutatedDefinitionsMap;
};

export const loadDefinitions = (config) => {
  const defaultDefinitionsMap = loadDefaultDefinitions();
  const mutatedDefinitionsMap = applyMutations(defaultDefinitionsMap, config.definitionResolver);
  return mutatedDefinitionsMap;
};


const resolveDefinition = (definition, ctx, node) => {
  if (!ctx.config.definitionResolver && typeof definition !== 'string') return definition;
  const definitionName = typeof definition === 'string' ? definition : definition.name;

  const resolvedDefinition = ctx.definitions[definitionName]
      && ctx.definitions[definitionName].resolveType
      && ctx.definitions[definitionName].resolveType(node) !== ctx.definitions[definitionName].name
    ? ctx.definitions[ctx.definitions[definitionName].resolveType(node)]
    : ctx.definitions[definitionName];

  return resolvedDefinition;
};

export default resolveDefinition;
