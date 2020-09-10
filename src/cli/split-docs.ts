import { readYaml, writeYaml } from '../utils';
import { red, blue, yellow, green } from 'colorette';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import * as mkdirp from 'mkdirp';
import * as path from 'path';
const isEqual = require('lodash.isequal');

const OPENAPI3_METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];
const OPENAPI3_COMPONENTS = [
  'schemas',
  'responses',
  'parameters',
  'examples',
  'headers',
  'requestBodies',
  'links',
  'callbacks',
  'securitySchemes'
];

function validateDefinitionFileName(fileName: string) {
  if (!fs.existsSync(fileName)) {
    process.stderr.write(red(`File ${blue(fileName)} does not exist \n`));
    process.exit(1);
  }

  let file: any;
  try {
    file = yaml.safeLoad(fs.readFileSync(fileName, 'utf8'));
  } catch (e) {
    process.stderr.write(red(e.message));
    process.exit(1);
  }

  if (file.swagger) {
    process.stderr.write(red('OpenAPI 2 is not supported by this tool'));
    process.exit(1);
  }

  if (!file.openapi) {
    process.stderr.write(red('File does not conform to the OpenAPI Specification'));
    process.exit(1);
  }

  return true;
}

function pathToFilename(path: string) {
  return path
    .replace(/~1/g, '/')
    .replace(/~0/g, '~')
    .substring(1)
    .replace(/\//g, '@');
}

function langToExt(lang: string) {
  const langObj: any = {
    php: '.php',
    'c#': '.cs',
    shell: '.sh',
    curl: '.sh',
    bash: '.sh',
    javascript: '.js',
    js: '.js',
    python: '.py'
  }
  return langObj[lang];
}

function traverseFolderDeep(folder: string, callback: any) {
  if (!fs.existsSync(folder) || !fs.statSync(folder).isDirectory()) return;
  const files = fs.readdirSync(folder);
  for (const f of files) {
    const filename = path.join(folder, f);
    if (fs.statSync(filename).isDirectory()) {
      traverseFolderDeep(filename, callback);
    } else {
      callback(filename);
    }
  }
}

function crawl(object: any, visitor: any) {
  if (typeof object !== 'object' || object == null) {
    return;
  }
  for (const key of Object.keys(object)) {
    visitor(object, key);
    crawl(object[key], visitor);
  }
}

function replace$Refs(obj: any, relativeFrom: any, componentFiles = {}) {
  // @ts-ignore
  crawl(obj, node => {
    if (node.$ref && typeof node.$ref === 'string' && node.$ref.startsWith('#/components/')) {
      replace(node, '$ref');
    } else if (
      node.discriminator &&
      node.discriminator.mapping &&
      typeof node.discriminator.mapping === 'object'
    ) {
      for (const name of Object.keys(node.discriminator.mapping)) {
        if (
          typeof node.discriminator.mapping[name] === 'string' &&
          node.discriminator.mapping[name].startsWith('#/components/')
        ) {
          replace(node.discriminator.mapping, name);
        }
      }
    }
  });

  function replace(node: any, key: string) {
    const name = node[key].split('/').pop();
    const groupName = node[key].split('/')[2];
    // @ts-ignore
    if (!componentFiles[groupName] || !componentFiles[groupName][name]) {
      return;
    }
    // @ts-ignore
    let filename = path.relative(relativeFrom, componentFiles[groupName][name].filename);

    if (!filename.startsWith('.')) {
      filename = '.' + path.sep + filename;
    }

    node[key] = filename;
  }
}

function implicitlyReferenceDiscriminator(
  obj: any,
  defName: string,
  filename: string,
  schemaFiles: any
) {
  if (!obj.discriminator) return;

  const defPtr = `#/components/schemas/${defName}`;
  const implicitMapping = {};
  // @ts-ignore
  for (const [name, { inherits, filename: parentFilename }] of Object.entries(schemaFiles)) {
    if (inherits.indexOf(defPtr) > -1) {
      const res = path.relative(path.dirname(filename), parentFilename);
      // @ts-ignore
      implicitMapping[name] = res.startsWith('.') ? res : '.' + path.sep + res;
    }
  }

  if (!Object.keys(implicitMapping).length) return;

  const discriminatorPropSchema = obj.properties[obj.discriminator.propertyName];
  const discriminatorEnum = discriminatorPropSchema && discriminatorPropSchema.enum;

  const mapping = (obj.discriminator.mapping = obj.discriminator.mapping || {});
  for (const name of Object.keys(implicitMapping)) {
    if (discriminatorEnum && !discriminatorEnum.includes(name)) {
      continue;
    }
    // @ts-ignore
    if (mapping[name] && mapping[name] !== implicitMapping[name]) {
      process.stderr.write(yellow(
        `warning: explicit mapping overlaps with local mapping entry ${red(name)} at ${blue(filename)}, Check manually, please`
      ));
    }
    // @ts-ignore
    mapping[name] = implicitMapping[name];
  }
}

function splitDefinition(openapi: any, openapiDir: string) {
  mkdirp.sync(openapiDir);
  const pathsDir = path.join(openapiDir, 'paths');
  mkdirp.sync(pathsDir);

  if (openapi.paths) {
    for (const oasPath of Object.keys(openapi.paths)) {
      const pathFile = path.join(pathsDir, pathToFilename(oasPath)) + '.yaml';
      const pathData = openapi.paths[oasPath];

      for (const method of OPENAPI3_METHODS) {
        const methodData = pathData[method];
        if (
          !methodData ||
          !methodData['x-code-samples'] ||
          !Array.isArray(methodData['x-code-samples'])
        ) {
          continue;
        }

        for (const sample of methodData['x-code-samples']) {
          if (sample.source && sample.source.$ref) continue;
          const sampleFileName = path.join(
            openapiDir,
            'code_samples',
            sample.lang,
            pathToFilename(oasPath),
            method + langToExt(sample.lang)
          );

          mkdirp.sync(path.dirname(sampleFileName));
          fs.writeFileSync(sampleFileName, sample.source);
          sample.source = {
            $ref: path.relative(pathsDir, sampleFileName)
          };
        }
      }

      writeYaml(pathData, pathFile);
      openapi.paths[oasPath] = {
        $ref: path.relative(openapiDir, pathFile)
      };
    }
  }

  const componentsDir = path.join(openapiDir, 'components');
  mkdirp.sync(componentsDir);

  const componentsFiles = {};

  if (openapi.components) {
    for (const componentType of OPENAPI3_COMPONENTS) {
      const compDir = path.join(componentsDir, componentType);
      if (openapi.components[componentType]) {
        mkdirp.sync(compDir);

        for (const componentName of Object.keys(openapi.components[componentType])) {
          const filename = path.join(compDir, componentName) + '.yaml';
          const componentData = openapi.components[componentType][componentName];
          if (fs.existsSync(filename) && isEqual(readYaml(filename), componentData)) {
            process.stderr.write(yellow(
              `warning: conflict for ${componentName} - file already exists with different content: ${blue(filename)} ... Skip.`
            ));
            continue;
          }
          writeYaml(componentData, filename);

          let inherits = [];
          if (componentType === 'schemas') {
            // @ts-ignore
            inherits = (componentData.allOf || []).map(s => s.$ref).filter(Boolean);
          }

          // @ts-ignore
          componentsFiles[componentType] = componentsFiles[componentType] || {};
          // @ts-ignore
          componentsFiles[componentType][componentName] = {
            inherits,
            filename
          };

          if (componentType !== 'securitySchemes') {
            // security schemas must referenced from components
            delete openapi.components[componentType][componentName];
          }
        }
        if (Object.keys(openapi.components[componentType]).length === 0) {
          delete openapi.components[componentType];
        }
      }
    }
    if (Object.keys(openapi.components).length === 0) {
      delete openapi.components;
    }
  }

  traverseFolderDeep(pathsDir, (filename: string) => {
    if (!filename.endsWith('.yaml') && !filename.endsWith('.yml')) {
      return;
    }
    const pathData = readYaml(filename);
    replace$Refs(pathData, pathsDir, componentsFiles);
    writeYaml(pathData, filename);
  })

  traverseFolderDeep(componentsDir, (filename: string) => {
    if (!filename.endsWith('.yaml') && !filename.endsWith('.yml')) {
      return;
    }
    const compData = readYaml(filename);
    replace$Refs(compData, path.dirname(filename), componentsFiles);
    implicitlyReferenceDiscriminator(
      compData,
      path.basename(filename, path.extname(filename)),
      filename,
      // @ts-ignore
      componentsFiles.schemas || {}
    );
    writeYaml(compData, filename);
  });

  replace$Refs(openapi, openapiDir, componentsFiles);
  writeYaml(openapi, path.join(openapiDir, 'openapi.yaml'));
}

export async function handleSplit (argv: {
  entrypoint?: string;
  outDir: string
}) {
  const { entrypoint, outDir } = argv;
  validateDefinitionFileName(entrypoint!);
  const openapi = readYaml(entrypoint!);
  splitDefinition(openapi, outDir);
  process.stderr.write(
    `🪓 Document: ${blue(entrypoint!)} ${green('is successfully split')} 
    and all related files are saved to the folder: ${blue(outDir)} \n`,
  );
}
