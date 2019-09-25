import yaml from 'js-yaml';
import fs from 'fs';

import traverse from './traverse';
import OpenAPIRoot from './validators';

export const validate = (yamlData, filePath, options) => {
  let document;
  try {
    document = yaml.safeLoad(yamlData);
  } catch (ex) {
    throw new Error("Can't load yaml file");
  }
  if (!document.openapi) return [];
  const result = traverse(document, OpenAPIRoot, yamlData, filePath, options);
  return result;
};

export const validateFromFile = (fName, options) => {
  const resolvedFileName = fName; // path.resolve(fName);
  const doc = fs.readFileSync(resolvedFileName, 'utf-8');
  const validationResult = validate(doc, resolvedFileName, options);
  return validationResult;
};
