import yaml from 'js-yaml';
import path from 'path';
import fs from 'fs';

import traverse from './traverse';
import OpenAPIRoot from './validators';

export const validate = (yamlData, filePath) => {
  let document;
  try {
    document = yaml.safeLoad(yamlData);
  } catch (ex) {
    throw new Error("Can't load yaml file");
  }
  const result = traverse(document, OpenAPIRoot, yamlData, filePath);
  return result;
};

export const validateFromFile = (fName) => {
  const resolvedFileName = path.resolve(fName);
  const doc = fs.readFileSync(resolvedFileName, 'utf-8');
  const validationResult = validate(doc, resolvedFileName);
  return validationResult;
};
