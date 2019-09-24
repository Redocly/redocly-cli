import yaml from 'js-yaml';
import fs from 'fs';

import traverse from './traverse';
import OpenAPIRoot from './validators';

export const validate = (yamlData, filePath) => {
  try {
    const document = yaml.safeLoad(yamlData);
    const result = traverse(document, OpenAPIRoot, yamlData, filePath);
    return result;
  } catch (ex) {
    // console.log('invalid yaml');
    return [];
  }
};

export const validateFromFile = (fName) => {
  const doc = fs.readFileSync(fName, 'utf-8');
  const validationResult = validate(doc, fName);
  return validationResult;
};
