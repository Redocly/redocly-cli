import { existsSync } from 'fs';

export default (typeName) => {
  const typePath = `${__dirname}/types/${typeName}.js`;
  // in case if required typeName exists in the default
  // directory for the types of the openapi-cli,
  // we return this type via requiring the default export.
  //
  // TODO: in future add support for named exports in the file.
  //
  // IDEAS: may be use context to load all the types on the warm-up
  // stage and then here lookup through the loaded types' names.
  // Might increaes performance quit a lot for cases with numerous
  // custom type extensions.
  if (existsSync(typePath)) return require(typePath).default;
  return null;
};
