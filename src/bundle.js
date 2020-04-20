import { getLintConfig } from './config';
import traverseNode from './traverse';
import createContext from './context';

import { OpenAPIRoot } from './types/OAS3';
import { OAS2Root } from './types/OAS2';

import { readYaml } from './utils';

function writeBundleToFile(bundleObject, outputFile) {
  const nameParts = outputFile.split('.');
  const ext = nameParts[nameParts.length - 1];

  const outputPath = path.resolve(outputFile);

  const outputDir = path.dirname(outputPath);
  fs.mkdirSync(outputDir, { recursive: true });

  let fileData = null;

  switch (ext) {
    case 'json':
      fileData = JSON.stringify(bundleObject, null, 2);
      break;
    case 'yaml':
    case 'yml':
    default:
      fileData = yaml.safeDump(bundleObject);
      break;
  }
  fs.writeFileSync(`${outputPath}`, fileData);
}

export const bundleToFile = async (fName, outputFile, force) => {
  const resolvedFileName = fName; // path.resolve(fName);
  const { document, source } = readYaml(resolvedFileName);

  if (!document.openapi && !document.swagger) { return []; }

  const lintConfig = getLintConfig({});
  lintConfig.rules = {
    ...lintConfig.rules,
    bundler: {
      ...(lintConfig.rules && typeof lintConfig.rules.bundler === 'object' ? lintConfig.rules.bundler : null),
      output: outputFile,
      ignoreErrors: force,
    },
  };

  const ctx = createContext(document, source, resolvedFileName, lintConfig);

  const rootNode = ctx.openapiVersion === 3 ? OpenAPIRoot : OAS2Root;
  await traverseNode(document, rootNode, ctx);

  if (outputFile) {
    writeBundleToFile(ctx.bundlingResult, outputFile);
  } else {
    process.stdout.write(yaml.safeDump(ctx.bundlingResult));
    process.stdout.write('\n');
  }

  return ctx.result;
};

export const bundle = async (fName, force, options) => {
  const resolvedFileName = fName; // path.resolve(fName);
  const { document, source } = readYaml(resolvedFileName);

  if (!document.openapi && !document.swagger) { return []; }

  const config = getLintConfig(options);
  config.rules = {
    ...config.rules,
    bundler: {
      ...(config.rules && typeof config.rules.bundler === 'object' ? config.rules.bundler : null),
      outputObject: true,
      ignoreErrors: force,
    },
  };

  const ctx = createContext(document, source, resolvedFileName, config);

  await traverseNode(document, OpenAPIRoot, ctx);

  return { bundle: ctx.bundlingResult, result: ctx.result, fileDependencies: ctx.fileDependencies };
};

export default bundleToFile;
