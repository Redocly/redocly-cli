import yaml from 'js-yaml';
import fs from 'fs';

import traverse from './traverse';
import OpenAPIRoot from './validators';

export const validate = (yamlData) => {
  try {
    const document = yaml.safeLoad(yamlData);
    const result = traverse(document, OpenAPIRoot, yamlData);
    return result;
  } catch (ex) {
    return [];
  }
};

export const validateFromFile = (fName) => {
  const doc = fs.readFileSync(fName, 'utf-8');
  const validationResult = validate(doc);
  return validationResult;
};
