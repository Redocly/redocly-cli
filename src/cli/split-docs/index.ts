import { readYaml, writeYaml } from '../../utils';
import { red, blue, yellow, green } from 'colorette';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import * as mkdirp from 'mkdirp';
import * as path from 'path';
const isEqual = require('lodash.isequal');
import { pathToFilename } from '../../ref-utils';
import { isString, isObject, isNotObjectKeys } from '../../js-utils';
import {
  Definition,
  Oas2Definition,
  Oas3Definition,
  ComponentsFiles,
  ComponentType,
  refObj,
  Oas3PathItem,
  OPENAPI3_COMPONENT,
  COMPONENTS,
  PATHS,
  OPENAPI3_METHODS,
  OPENAPI3_COMPONENTS
} from './types'

function isStartsWithComponents(node: string) {
  const componentsPath = `#/${COMPONENTS}/`;
  return node.startsWith(componentsPath)
}

function isNotYaml(filename: string) {
  return !(filename.endsWith('.yaml') || filename.endsWith('.yml'));
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
  if ((file as Oas2Definition).swagger) stdWriteExit('OpenAPI 2 is not supported by this command');
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

function getComponentRefs(obj: any) {
  const refs: string[] = [];
  crawl(obj, (node: any) => {
    if (node.$ref && isString(node.$ref) && isStartsWithComponents(node.$ref)) {
      const name = node.$ref.split('/').pop();
      if (!refs.includes(name)) refs.push(name);
    }
  })
  return refs;
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

function isNotSecurityComponentType(componentType: string) {
  return componentType !== OPENAPI3_COMPONENT.SecuritySchemes
}

function findComponentTypes(components: any) {
  return OPENAPI3_COMPONENTS
    .filter(item => isNotSecurityComponentType(item) && Object.keys(components).includes(item))
    .map(type => ({ name: type, data: components[type] }))
}

function isFileNotEqual(filename: string, componentData: string, componentName: string) {
  const result = fs.existsSync(filename) && !isEqual(readYaml(filename), componentData);
  if (result) {
    process.stderr.write(yellow(
      `warning: conflict for ${componentName} - file already exists
         with different content: ${blue(filename)} ... Skip.\n`
    ));
  }
  return result;
}

function cleanupComponentsExceptSecuritySchemes(
  openapi: Oas3Definition,
  componentType: string,
  componentName: string
) {
  if (isNotSecurityComponentType(componentType)) {
    // security schemas must referenced from components
    // @ts-ignore
    delete openapi.components[componentType][componentName];
  }
}

function cleanupEmptyProperties(openapi: Oas3Definition, componentType: string) {
  // @ts-ignore
  if (isNotObjectKeys(openapi.components && openapi.components[componentType])) {
    // @ts-ignore
    delete openapi.components[componentType];
  }
  if (isNotObjectKeys(openapi.components)) {
    delete openapi.components;
  }
}

function createComponentDir(componetDirPath: string, componentType: string) {
  if (isNotSecurityComponentType(componentType)) {
    mkdirp.sync(componetDirPath);
  }
}

function isRefComponentsExist(componentRefs: string[], components: string[]) {
  return componentRefs.length ? components.some(c => componentRefs.includes(c)) : true;
}

function extractFileNameFromPath(filename: string) {
  return path.basename(filename, path.extname(filename));
}

function getFileNamePath(componentDirPath: string, componentName: string) {
  return path.join(componentDirPath, componentName) + '.yaml';
}

function gatheringComponentsFiles(
  componentsFiles: ComponentsFiles,
  componentType: ComponentType,
  componentName: string,
  filename: string
) {
  let inherits = [];
  if (componentType.name === OPENAPI3_COMPONENT.Schemas) {
    inherits = (componentType.data[componentName].allOf || []).map((s: any) => s.$ref).filter(Boolean);
  }
  componentsFiles[componentType.name] = componentsFiles[componentType.name] || {};
  componentsFiles[componentType.name][componentName] = { inherits, filename };
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
      const pathData: Oas3PathItem = paths[oasPath];
      const XCodeSamples = 'x-code-samples';

      for (const method of OPENAPI3_METHODS) {
        const methodData = pathData[method];
        const methodDataXCode = methodData?.[XCodeSamples];
        if (!methodDataXCode || !Array.isArray(methodDataXCode)) { continue; }

        for (const sample of methodDataXCode) {
          // @ts-ignore
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
          // @ts-ignore
          sample.source = {
            $ref: path.relative(pathsDir, sampleFileName)
          };
        }
      }

      writeYaml(pathData, pathFile);
      paths[oasPath] = {
        // @ts-ignore
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
    mkdirp.sync(componentsDir);
    const componentTypes = findComponentTypes(components);
    componentTypes.forEach(iterateComponentTypes);

    function iterateComponentTypes(componentType: ComponentType) {
      const allComponents: string[] = [];
      const componentDirPath = path.join(componentsDir, componentType.name);
      createComponentDir(componentDirPath, componentType.name);
      const comps = Object.keys(componentType.data);
      allComponents.push(...comps)

      for (const componentName of comps) {
        const filename = getFileNamePath(componentDirPath, componentName);
        gatheringComponentsFiles(componentsFiles, componentType, componentName, filename);
      }

      for (const componentName of comps) {
        const filename = getFileNamePath(componentDirPath, componentName);
        const componentData = componentType.data[componentName];
        const componentRefs = getComponentRefs(componentData);

        if (isRefComponentsExist(componentRefs, allComponents)) {
          replace$Refs(componentData, path.dirname(filename), componentsFiles);
          implicitlyReferenceDiscriminator(
            componentData,
            extractFileNameFromPath(filename),
            filename,
            componentsFiles.schemas || {}
          );

          if (!isFileNotEqual(filename, componentData, componentName)) {
            writeYaml(componentData, filename);
          }

          cleanupComponentsExceptSecuritySchemes(openapi, componentType.name, componentName);
        } else {
          process.stderr.write(yellow(
            `warning: conflict for ${componentName} - Reference files for the file: ${blue(filename)} are not exist ... Skip.\n`
          ));
        }
      }
      cleanupEmptyProperties(openapi, componentType.name);
    }
  }
}

function splitDefinition(openapi: Oas3Definition, openapiDir: string) {
  mkdirp.sync(openapiDir);
  const pathsDir = path.join(openapiDir, PATHS);
  mkdirp.sync(pathsDir);

  const componentsFiles: ComponentsFiles = {};
  iteratePaths(openapi, pathsDir, openapiDir);
  iterateComponents(openapi, openapiDir, componentsFiles);

  function traverseFolderDeepCallback(filename: string, folder: string) {
    if (isNotYaml(filename)) return;
    const pathData = readYaml(filename);
    replace$Refs(pathData, folder, componentsFiles);
    writeYaml(pathData, filename);
  }

  traverseFolderDeep(pathsDir, traverseFolderDeepCallback);
  replace$Refs(openapi, openapiDir, componentsFiles);
  writeYaml(openapi, path.join(openapiDir, 'openapi.yaml'));
}

export async function handleSplit (argv: {
  entrypoint?: string;
  outDir: string
}) {
  const { entrypoint, outDir } = argv;
  validateDefinitionFileName(entrypoint!);
  const openapi = readYaml(entrypoint!) as Oas3Definition;
  splitDefinition(openapi, outDir);
  process.stderr.write(
    `🪓 Document: ${blue(entrypoint!)} ${green('is successfully split')} 
    and all related files are saved to the folder: ${blue(outDir)} \n`,
  );
}
