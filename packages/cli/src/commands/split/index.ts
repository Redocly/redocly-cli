import { red, blue, yellow, green } from 'colorette';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import * as path from 'path';
import { performance } from 'perf_hooks';
const isEqual = require('lodash.isequal');
import { printExecutionTime, pathToFilename, readYaml, writeYaml, exitWithError } from '../../utils';
import { isString, isObject, isEmptyObject } from '../../js-utils';
import {
  Definition,
  Oas2Definition,
  Oas3Schema,
  Oas3Definition,
  Oas3Components,
  Oas3ComponentName,
  ComponentsFiles,
  refObj,
  Oas3PathItem,
  OPENAPI3_COMPONENT,
  COMPONENTS,
  componentsPath,
  PATHS,
  OPENAPI3_METHOD_NAMES,
  OPENAPI3_COMPONENT_NAMES
} from './types'

export async function handleSplit (argv: {
  entrypoint?: string;
  outDir: string
}) {
  const startedAt = performance.now();
  const { entrypoint, outDir } = argv;
  validateDefinitionFileName(entrypoint!);
  const openapi = readYaml(entrypoint!) as Oas3Definition;
  splitDefinition(openapi, outDir);
  process.stderr.write(
    `🪓 Document: ${blue(entrypoint!)} ${green('is successfully split')}
    and all related files are saved to the directory: ${blue(outDir)} \n`,
  );
  printExecutionTime('split', startedAt, entrypoint!);
}

function splitDefinition(openapi: Oas3Definition, openapiDir: string) {
  fs.mkdirSync(openapiDir, { recursive: true });
  const pathsDir = path.join(openapiDir, PATHS);
  fs.mkdirSync(pathsDir, { recursive: true });

  const componentsFiles: ComponentsFiles = {};
  iteratePaths(openapi, pathsDir, openapiDir);
  iterateComponents(openapi, openapiDir, componentsFiles);

  function traverseDirectoryDeepCallback(filename: string, directory: string) {
    if (isNotYaml(filename)) return;
    const pathData = readYaml(filename);
    replace$Refs(pathData, directory, componentsFiles);
    writeYaml(pathData, filename);
  }

  traverseDirectoryDeep(pathsDir, traverseDirectoryDeepCallback);
  replace$Refs(openapi, openapiDir, componentsFiles);
  writeYaml(openapi, path.join(openapiDir, 'openapi.yaml'));
}

function isStartsWithComponents(node: string) {
  return node.startsWith(componentsPath)
}

function isNotYaml(filename: string) {
  return !(filename.endsWith('.yaml') || filename.endsWith('.yml'));
}

function loadFile(fileName: string) {
  try {
    return yaml.safeLoad(fs.readFileSync(fileName, 'utf8')) as Definition;
  } catch (e) {
    return exitWithError(e.message);
  }
}

function validateDefinitionFileName(fileName: string) {
  if (!fs.existsSync(fileName)) exitWithError(`File ${blue(fileName)} does not exist \n`);
  const file = loadFile(fileName);
  if ((file as Oas2Definition).swagger) exitWithError('OpenAPI 2 is not supported by this command');
  if (!(file as Oas3Definition).openapi) exitWithError('File does not conform to the OpenAPI Specification. OpenAPI version is not specified');
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

function traverseDirectoryDeep(directory: string, callback: any) {
  if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) return;
  const files = fs.readdirSync(directory);
  for (const f of files) {
    const filename = path.join(directory, f);
    if (fs.statSync(filename).isDirectory()) {
      traverseDirectoryDeep(filename, callback);
    } else {
      callback(filename, directory);
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

function replace$Refs(
  obj: any,
  relativeFrom: string,
  componentFiles = {} as ComponentsFiles
) {
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
    if (discriminatorEnum && !discriminatorEnum.includes(name)) { continue; }
    if (mapping[name] && mapping[name] !== implicitMapping[name]) {
      process.stderr.write(yellow(
        `warning: explicit mapping overlaps with local mapping entry ${red(name)} at ${blue(filename)}. Please check it.`
      ));
    }
    mapping[name] = implicitMapping[name];
  }
}

function isNotSecurityComponentType(componentType: string) {
  return componentType !== OPENAPI3_COMPONENT.SecuritySchemes
}

function findComponentTypes(components: any) {
  return OPENAPI3_COMPONENT_NAMES
    .filter(item => isNotSecurityComponentType(item) && Object.keys(components).includes(item))
}

function doesFileDiffer(filename: string, componentData: any) {
  return fs.existsSync(filename) && !isEqual(readYaml(filename), componentData);
}

function removeEmptyComponents(openapi: Oas3Definition, componentType: Oas3ComponentName) {
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
  let inherits = [];
  if (componentType === OPENAPI3_COMPONENT.Schemas) {
    inherits = ((components?.[componentType]?.[componentName] as Oas3Schema)?.allOf || []).map((s: any) => s.$ref).filter(Boolean);
  }
  componentsFiles[componentType] = componentsFiles[componentType] || {};
  componentsFiles[componentType][componentName] = { inherits, filename };
}

function iteratePaths(
  openapi: Oas3Definition,
  pathsDir: string,
  openapiDir: string
) {
  const { paths } = openapi;
  if (paths) {
    for (const oasPath of Object.keys(paths)) {
      const pathFile = path.join(pathsDir, pathToFilename(oasPath)) + '.yaml';
      const pathData: Oas3PathItem = paths[oasPath] as Oas3PathItem;

      for (const method of OPENAPI3_METHOD_NAMES) {
        const methodData = pathData[method];
        const methodDataXCode = methodData?.['x-code-samples'] || methodData?.['x-codeSamples'];
        if (!methodDataXCode || !Array.isArray(methodDataXCode)) { continue; }
        for (const sample of methodDataXCode) {
          if (sample.source && (sample.source as any).$ref) continue;
          const sampleFileName = path.join(
            openapiDir,
            'code_samples',
            sample.lang,
            pathToFilename(oasPath),
            method + langToExt(sample.lang)
          );

          fs.mkdirSync(path.dirname(sampleFileName), { recursive: true });
          fs.writeFileSync(sampleFileName, sample.source);
          // @ts-ignore
          sample.source = {
            $ref: path.relative(pathsDir, sampleFileName)
          };
        }
      }

      writeYaml(pathData, pathFile);
      paths[oasPath] = {
        $ref: path.relative(openapiDir, pathFile)
      };
    }
  }
}

function iterateComponents(
  openapi: Oas3Definition,
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

    function iterateAndGatherComponentsFiles(componentType: Oas3ComponentName) {
      const componentDirPath = path.join(componentsDir, componentType);
      for (const componentName of Object.keys(components?.[componentType] || {})) {
        const filename = getFileNamePath(componentDirPath, componentName);
        gatherComponentsFiles(components!, componentsFiles, componentType, componentName, filename);
      }
    }

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
          process.stderr.write(yellow(
            `warning: conflict for ${componentName} - file already exists with different content: ${blue(filename)} ... Skip.\n`
          ));
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
