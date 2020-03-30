import defaultDefinitionsMap from '../types';


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
  const definitionMap = ctx.definitions[ctx.openapiVersion === 2 ? 'OAS2' : 'OAS3'];

  const resolvedDefinition = definitionMap[definitionName]
      && definitionMap[definitionName].resolveType
      && definitionMap[definitionName].resolveType(node) !== definitionMap[definitionName].name
    ? definitionMap[definitionMap[definitionName].resolveType(node)]
    : definitionMap[definitionName];

  return resolvedDefinition;
};

export default resolveDefinition;
