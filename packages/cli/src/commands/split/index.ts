import { red, blue, yellow, green } from 'colorette';
import * as fs from 'fs';
import { parseYaml, slash, isRef, isTruthy } from '@redocly/openapi-core';
import type { OasRef } from '@redocly/openapi-core';
import * as path from 'path';
import { performance } from 'perf_hooks';
const isEqual = require('lodash.isequal');

import {
  printExecutionTime,
  pathToFilename,
  readYaml,
  writeYaml,
  exitWithError,
  escapeLanguageName,
  langToExt,
} from '../../utils';
import { isString, isObject, isEmptyObject } from '../../js-utils';
import {
  Definition,
  Oas2Definition,
  Oas3Schema,
  Oas3Definition,
  Oas3_1Definition,
  Oas3Components,
  Oas3ComponentName,
  ComponentsFiles,
  refObj,
  Oas3PathItem,
  OPENAPI3_COMPONENT,
  COMPONENTS,
  componentsPath,
  OPENAPI3_METHOD_NAMES,
  OPENAPI3_COMPONENT_NAMES,
  Referenced,
} from './types';

export async function handleSplit(argv: { api: string; outDir: string; separator: string }) {
  const startedAt = performance.now();
  const { api, outDir, separator } = argv;
  validateDefinitionFileName(api!);
  const openapi = readYaml(api!) as Oas3Definition | Oas3_1Definition;
  splitDefinition(openapi, outDir, separator);
  process.stderr.write(
    `🪓 Document: ${blue(api!)} ${green('is successfully split')}
    and all related files are saved to the directory: ${blue(outDir)} \n`
  );
  printExecutionTime('split', startedAt, api!);
}

function splitDefinition(
  openapi: Oas3Definition | Oas3_1Definition,
  openapiDir: string,
  pathSeparator: string
) {
  fs.mkdirSync(openapiDir, { recursive: true });

  const componentsFiles: ComponentsFiles = {};
  iterateComponents(openapi, openapiDir, componentsFiles);
  iteratePathItems(
    openapi.paths,
    openapiDir,
    path.join(openapiDir, 'paths'),
    componentsFiles,
    pathSeparator
  );
  const webhooks =
    (openapi as Oas3_1Definition).webhooks || (openapi as Oas3Definition)['x-webhooks'];
  // use webhook_ prefix for code samples to prevent potential name-clashes with paths samples
  iteratePathItems(
    webhooks,
    openapiDir,
    path.join(openapiDir, 'webhooks'),
    componentsFiles,
    pathSeparator,
    'webhook_'
  );

  replace$Refs(openapi, openapiDir, componentsFiles);
  writeYaml(openapi, path.join(openapiDir, 'openapi.yaml'));
}

function isStartsWithComponents(node: string) {
  return node.startsWith(componentsPath);
}

function isNotYaml(filename: string) {
  return !(filename.endsWith('.yaml') || filename.endsWith('.yml'));
}

function loadFile(fileName: string) {
  try {
    return parseYaml(fs.readFileSync(fileName, 'utf8')) as Definition;
  } catch (e) {
    return exitWithError(e.message);
  }
}

function validateDefinitionFileName(fileName: string) {
  if (!fs.existsSync(fileName)) exitWithError(`File ${blue(fileName)} does not exist \n`);
  const file = loadFile(fileName);
  if ((file as Oas2Definition).swagger) exitWithError('OpenAPI 2 is not supported by this command');
  if (!(file as Oas3Definition | Oas3_1Definition).openapi)
    exitWithError(
      'File does not conform to the OpenAPI Specification. OpenAPI version is not specified'
    );
  return true;
}

function traverseDirectoryDeep(directory: string, callback: any, componentsFiles: object) {
  if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) return;
  const files = fs.readdirSync(directory);
  for (const f of files) {
    const filename = path.join(directory, f);
    if (fs.statSync(filename).isDirectory()) {
      traverseDirectoryDeep(filename, callback, componentsFiles);
    } else {
      callback(filename, directory, componentsFiles);
    }
  }
}

function traverseDirectoryDeepCallback(
  filename: string,
  directory: string,
  componentsFiles: object
) {
  if (isNotYaml(filename)) return;
  const pathData = readYaml(filename);
  replace$Refs(pathData, directory, componentsFiles);
  writeYaml(pathData, filename);
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
  const defPtr = `#/${COMPONENTS}/${OPENAPI3_COMPONENT.Schemas}/${defName}`;
  const implicitMapping = {} as any;
  for (const [name, { inherits, filename: parentFilename }] of Object.entries(schemaFiles) as any) {
    if (inherits.indexOf(defPtr) > -1) {
      const res = path.relative(path.dirname(filename), parentFilename);
      implicitMapping[name] = res.startsWith('.') ? res : '.' + path.sep + res;
    }
  }

  if (isEmptyObject(implicitMapping)) return;
  const discriminatorPropSchema = obj.properties[obj.discriminator.propertyName];
  const discriminatorEnum = discriminatorPropSchema && discriminatorPropSchema.enum;
  const mapping = (obj.discriminator.mapping = obj.discriminator.mapping || {});
  for (const name of Object.keys(implicitMapping)) {
    if (discriminatorEnum && !discriminatorEnum.includes(name)) {
      continue;
    }
    if (mapping[name] && mapping[name] !== implicitMapping[name]) {
      process.stderr.write(
        yellow(
          `warning: explicit mapping overlaps with local mapping entry ${red(name)} at ${blue(
            filename
          )}. Please check it.`
        )
      );
    }
    mapping[name] = implicitMapping[name];
  }
}

function isNotSecurityComponentType(componentType: string) {
  return componentType !== OPENAPI3_COMPONENT.SecuritySchemes;
}

function findComponentTypes(components: any) {
  return OPENAPI3_COMPONENT_NAMES.filter(
    (item) => isNotSecurityComponentType(item) && Object.keys(components).includes(item)
  );
}

function doesFileDiffer(filename: string, componentData: any) {
  return fs.existsSync(filename) && !isEqual(readYaml(filename), componentData);
}

function removeEmptyComponents(
  openapi: Oas3Definition | Oas3_1Definition,
  componentType: Oas3ComponentName
) {
  if (openapi.components && isEmptyObject(openapi.components[componentType])) {
    delete openapi.components[componentType];
  }
  if (isEmptyObject(openapi.components)) {
    delete openapi.components;
  }
}

function createComponentDir(componentDirPath: string, componentType: string) {
  if (isNotSecurityComponentType(componentType)) {
    fs.mkdirSync(componentDirPath, { recursive: true });
  }
}

function extractFileNameFromPath(filename: string) {
  return path.basename(filename, path.extname(filename));
}

function getFileNamePath(componentDirPath: string, componentName: string) {
  return path.join(componentDirPath, componentName) + '.yaml';
}

function gatherComponentsFiles(
  components: Oas3Components,
  componentsFiles: ComponentsFiles,
  componentType: Oas3ComponentName,
  componentName: string,
  filename: string
) {
  let inherits: string[] = [];
  if (componentType === OPENAPI3_COMPONENT.Schemas) {
    inherits = ((components?.[componentType]?.[componentName] as Oas3Schema)?.allOf || [])
      .map(({ $ref }) => $ref)
      .filter(isTruthy);
  }
  componentsFiles[componentType] = componentsFiles[componentType] || {};
  componentsFiles[componentType][componentName] = { inherits, filename };
}

function iteratePathItems(
  pathItems: Record<string, Referenced<Oas3PathItem>> | undefined,
  openapiDir: string,
  outDir: string,
  componentsFiles: object,
  pathSeparator: string,
  codeSamplesPathPrefix: string = ''
) {
  if (!pathItems) return;
  fs.mkdirSync(outDir, { recursive: true });

  for (const pathName of Object.keys(pathItems)) {
    const pathFile = `${path.join(outDir, pathToFilename(pathName, pathSeparator))}.yaml`;
    const pathData = pathItems[pathName] as Oas3PathItem;

    if (isRef(pathData)) continue;

    for (const method of OPENAPI3_METHOD_NAMES) {
      const methodData = pathData[method];
      const methodDataXCode = methodData?.['x-code-samples'] || methodData?.['x-codeSamples'];
      if (!methodDataXCode || !Array.isArray(methodDataXCode)) {
        continue;
      }
      for (const sample of methodDataXCode) {
        if (sample.source && (sample.source as unknown as OasRef).$ref) continue;
        const sampleFileName = path.join(
          openapiDir,
          'code_samples',
          escapeLanguageName(sample.lang),
          codeSamplesPathPrefix + pathToFilename(pathName, pathSeparator),
          method + langToExt(sample.lang)
        );

        fs.mkdirSync(path.dirname(sampleFileName), { recursive: true });
        fs.writeFileSync(sampleFileName, sample.source);
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        sample.source = {
          $ref: slash(path.relative(outDir, sampleFileName)),
        };
      }
    }
    writeYaml(pathData, pathFile);
    pathItems[pathName] = {
      $ref: slash(path.relative(openapiDir, pathFile)),
    };

    traverseDirectoryDeep(outDir, traverseDirectoryDeepCallback, componentsFiles);
  }
}

function iterateComponents(
  openapi: Oas3Definition | Oas3_1Definition,
  openapiDir: string,
  componentsFiles: ComponentsFiles
) {
  const { components } = openapi;
  if (components) {
    const componentsDir = path.join(openapiDir, COMPONENTS);
    fs.mkdirSync(componentsDir, { recursive: true });
    const componentTypes = findComponentTypes(components);
    componentTypes.forEach(iterateAndGatherComponentsFiles);
    componentTypes.forEach(iterateComponentTypes);

    // eslint-disable-next-line no-inner-declarations
    function iterateAndGatherComponentsFiles(componentType: Oas3ComponentName) {
      const componentDirPath = path.join(componentsDir, componentType);
      for (const componentName of Object.keys(components?.[componentType] || {})) {
        const filename = getFileNamePath(componentDirPath, componentName);
        gatherComponentsFiles(components!, componentsFiles, componentType, componentName, filename);
      }
    }

    // eslint-disable-next-line no-inner-declarations
    function iterateComponentTypes(componentType: Oas3ComponentName) {
      const componentDirPath = path.join(componentsDir, componentType);
      createComponentDir(componentDirPath, componentType);
      for (const componentName of Object.keys(components?.[componentType] || {})) {
        const filename = getFileNamePath(componentDirPath, componentName);
        const componentData = components?.[componentType]?.[componentName];
        replace$Refs(componentData, path.dirname(filename), componentsFiles);
        implicitlyReferenceDiscriminator(
          componentData,
          extractFileNameFromPath(filename),
          filename,
          componentsFiles.schemas || {}
        );

        if (doesFileDiffer(filename, componentData)) {
          process.stderr.write(
            yellow(
              `warning: conflict for ${componentName} - file already exists with different content: ${blue(
                filename
              )} ... Skip.\n`
            )
          );
        } else {
          writeYaml(componentData, filename);
        }

        if (isNotSecurityComponentType(componentType)) {
          // security schemas must referenced from components
          delete openapi.components?.[componentType]?.[componentName];
        }
      }
      removeEmptyComponents(openapi, componentType);
    }
  }
}

export { iteratePathItems };
