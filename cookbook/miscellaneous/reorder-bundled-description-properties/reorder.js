import { parseYaml, stringifyYaml } from '@redocly/openapi-core';
import fs from 'fs';

const reorder = (root) => {
  const { components, openapi, ...rest } = root;
  return {
    // Here you can put the properties in the order you want
    components,
    ...rest,
    openapi,
  };
};

const fileName = process.argv[2];
const content = fs.readFileSync(fileName, 'utf8');
const reordered = reorder(parseYaml(content));
process.stdout.write(stringifyYaml(reordered));
