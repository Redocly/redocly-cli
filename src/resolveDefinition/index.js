import * as defaultDefinitionsMap from '../types';


const applyMutations = (defaultDefs, definitionReducer) => {
  const mutatedDefinitionsMap = definitionReducer(defaultDefs);
  return mutatedDefinitionsMap;
};

export const loadDefinitions = (config) => {
  const customTypesNames = [];
  const t = applyMutations({}, config.definitionResolver);
  Object.keys(t).forEach((typeDefName) => {
    if (!t[typeDefName].name) {
      customTypesNames.push(typeDefName);
    }
  });

  const mutatedDefinitionsMap = applyMutations(
    { ...defaultDefinitionsMap }, config.definitionResolver,
  );
  customTypesNames.forEach((typeDefName) => {
    mutatedDefinitionsMap[typeDefName].name = typeDefName;
  });
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
