import { readYaml, writeYaml } from '../utils';
import { red, blue, yellow, green } from 'colorette';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import * as mkdirp from 'mkdirp';
import * as path from 'path';
const isEqual = require('lodash.isequal');
import { Oas3Definition } from '../typings/openapi';
import { Oas2Definition } from '../typings/swagger'
import { pathToFilename } from '../ref-utils';
import { isString, isObject } from '../js-utils';

type Definition = Oas3Definition | Oas2Definition;
interface ComponentsFiles {
  [schemas: string]: any;
}
interface refObj {
  [$ref: string]: string;
}
const COMPONENTS = 'components';
const PATHS = 'paths';
const SCHEMAS = 'schemas';
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

function isStartsWithComponents(node: string) {
  const componentsPath = `#/${COMPONENTS}/`;
  return node.startsWith(componentsPath)
}

function isNotYaml(filename: string) {
  return !(filename.endsWith('.yaml') || filename.endsWith('.yml'));
}

function isNotObjectKeys(obj: any) {
  return Object.keys(obj).length === 0;
}

function stdWriteExit(message: string) {
  process.stderr.write(red(message));
  process.exit(1);
}

function loadFile(fileName: string) {
  try {
    return yaml.safeLoad(fs.readFileSync(fileName, 'utf8')) as Definition;
  } catch (e) {
    return stdWriteExit(e.message);
  }
}

function validateDefinitionFileName(fileName: string) {
  if (!fs.existsSync(fileName)) stdWriteExit(`File ${blue(fileName)} does not exist \n`);
  const file = loadFile(fileName);
  if ((file as Oas2Definition).swagger) stdWriteExit('OpenAPI 2 is not supported by this tool');
  if (!(file as Oas3Definition).openapi) stdWriteExit('File does not conform to the OpenAPI Specification');
  return true;
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
      callback(filename, folder);
    }
  }
}

function crawl(object: any, visitor: any) {
  if (!isObject(object)) return;
  for (const key of Object.keys(object)) {
    visitor(object, key);
    crawl(object[key], visitor);
  }
}

function replace$Refs(obj: any, relativeFrom: string, componentFiles = {} as ComponentsFiles) {
  crawl(obj, (node: any) => {
    if (node.$ref && isString(node.$ref) && isStartsWithComponents(node.$ref)) {
      replace(node, '$ref');
    } else if (
      node.discriminator &&
      node.discriminator.mapping &&
      isObject(node.discriminator.mapping)
    ) {
      const { mapping } = node.discriminator;
      for (const name of Object.keys(mapping)) {
        if (isString(mapping[name]) && isStartsWithComponents(mapping[name])) {
          replace(node.discriminator.mapping, name);
        }
      }
    }
  });

  function replace(node: refObj, key: string) {
    const splittedNode = node[key].split('/');
    const name = splittedNode.pop();
    const groupName = splittedNode[2];
    const filesGroupName = componentFiles[groupName];
    if (!filesGroupName || !filesGroupName[name!]) return;
    let filename = path.relative(relativeFrom, filesGroupName[name!].filename);
    if (!filename.startsWith('.')) { filename = '.' + path.sep + filename; }
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

  const defPtr = `#/${COMPONENTS}/${SCHEMAS}/${defName}`;
  const implicitMapping = {} as any;
  for (const [name, { inherits, filename: parentFilename }] of Object.entries(schemaFiles) as any) {
    if (inherits.indexOf(defPtr) > -1) {
      const res = path.relative(path.dirname(filename), parentFilename);
      implicitMapping[name] = res.startsWith('.') ? res : '.' + path.sep + res;
    }
  }

  if (isNotObjectKeys(implicitMapping)) return;
  const discriminatorPropSchema = obj.properties[obj.discriminator.propertyName];
  const discriminatorEnum = discriminatorPropSchema && discriminatorPropSchema.enum;

  const mapping = (obj.discriminator.mapping = obj.discriminator.mapping || {});
  for (const name of Object.keys(implicitMapping)) {
    if (discriminatorEnum && !discriminatorEnum.includes(name)) { continue; }
    if (mapping[name] && mapping[name] !== implicitMapping[name]) {
      process.stderr.write(yellow(
        `warning: explicit mapping overlaps with local mapping entry ${red(name)} at ${blue(filename)}, Check manually, please`
      ));
    }
    mapping[name] = implicitMapping[name];
  }
}

function splitDefinition(openapi: any, openapiDir: string) {
  mkdirp.sync(openapiDir);
  const pathsDir = path.join(openapiDir, PATHS);
  mkdirp.sync(pathsDir);

  if (openapi.paths) {
    for (const oasPath of Object.keys(openapi.paths)) {
      const pathFile = path.join(pathsDir, pathToFilename(oasPath)) + '.yaml';
      const pathData = openapi.paths[oasPath];
      const XCodeSamples = 'x-code-samples';
      for (const method of OPENAPI3_METHODS) {
        const methodData = pathData[method];
        if (
          !methodData ||
          !methodData[XCodeSamples] ||
          !Array.isArray(methodData[XCodeSamples])
        ) {
          continue;
        }

        for (const sample of methodData[XCodeSamples]) {
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

  const componentsDir = path.join(openapiDir, COMPONENTS);
  mkdirp.sync(componentsDir);

  const componentsFiles: ComponentsFiles = {};

  if (openapi.components) {
    for (const componentType of OPENAPI3_COMPONENTS) {
      const compDir = path.join(componentsDir, componentType);
      if (openapi.components[componentType]) {
        mkdirp.sync(compDir);
        const compType = openapi.components[componentType];

        for (const componentName of Object.keys(compType)) {
          const filename = path.join(compDir, componentName) + '.yaml';
          const componentData = compType[componentName];
          if (fs.existsSync(filename) && isEqual(readYaml(filename), componentData)) {
            process.stderr.write(yellow(
              `warning: conflict for ${componentName} - file already exists with different content: ${blue(filename)} ... Skip.`
            ));
            continue;
          }
          writeYaml(componentData, filename);

          let inherits = [];
          if (componentType === SCHEMAS) {
            inherits = (componentData.allOf || []).map((s: any) => s.$ref).filter(Boolean);
          }
          componentsFiles[componentType] = componentsFiles[componentType] || {};
          componentsFiles[componentType][componentName] = { inherits, filename };

          if (componentType !== 'securitySchemes') {
            // security schemas must referenced from components
            delete openapi.components[componentType][componentName];
          }
        }
        if (isNotObjectKeys(openapi.components[componentType])) { delete openapi.components[componentType]; }
      }
    }
    if (isNotObjectKeys(openapi.components)) { delete openapi.components; }
  }

  function traverseFolderDeepCallback(filename: string, folder: string) {
    if (isNotYaml(filename)) return;
    const pathData = readYaml(filename);
    const isComponentsDir = folder.includes(COMPONENTS);
    const folderPath = isComponentsDir ? path.dirname(filename) : folder;
    replace$Refs(pathData, folderPath, componentsFiles);
    writeYaml(pathData, filename);
    if (isComponentsDir) {
      implicitlyReferenceDiscriminator(
        pathData,
        path.basename(filename, path.extname(filename)),
        filename,
        componentsFiles.schemas || {}
      );
    }
  }

  traverseFolderDeep(pathsDir, traverseFolderDeepCallback);
  traverseFolderDeep(componentsDir, traverseFolderDeepCallback);
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
