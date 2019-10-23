export default (definition, ctx) => {
  if (!ctx.config.typeExtension) return definition;
  const extension = ctx.config.typeExtension[definition.name];
  if (!extension) return definition;
  console.log(definition.name);
  console.log(ctx.config.typeExtension);
  console.log({
    ...definition,
    properties: {
      ...definition.properties,
      ...extension,
    },
  });
  return {
    ...definition,
    properties: {
      ...definition.properties,
      ...extension,
    },
  };
};
