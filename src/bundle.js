import yaml from 'js-yaml';
import fs from 'fs';

import OpenAPIRoot from './types';
import { createContext } from './validate';

import traverseNode from './traverse';

export const bundle = (fName, outputFile) => {
  const resolvedFileName = fName; // path.resolve(fName);
  const doc = fs.readFileSync(resolvedFileName, 'utf-8');
  let document;
  try {
    document = yaml.safeLoad(doc);
  }
  catch (ex) {
    throw new Error("Can't load yaml file");
  }
  if (!document.openapi)
    return [];
  const config = {
    codeframes: true,
    rules: {
      bundler: {
        output: outputFile,
      },
    },
  };
  const ctx = createContext(document, doc, resolvedFileName, config);
  traverseNode(document, OpenAPIRoot, ctx);
  return ctx.result;
};
