import * as fs from 'fs';
import * as path from 'path';
import fetch from 'node-fetch';
import { yellow, green, blue } from 'colorette';
import { createHash } from 'crypto';
import { Config, loadConfig, RedoclyClient } from '@redocly/openapi-core';
import { promptUser, exitWithError, printExecutionTime } from '../utils';
import { performance } from "perf_hooks";

type Source = {
  files: string[];
  branchName?: string;
  root?: string;
}

export async function handlePush (argv: {
  entrypoint?: string;
  destination?: string;
  branchName?: string;
  upsert?: boolean;
  'run-id'?: string;
}) {
  const client = new RedoclyClient();
  const isAuthorized = await client.isAuthorizedWithRedocly();
  if (!isAuthorized) {
    const clientToken = await promptUser(
       green(`\n  🔑 Copy your access token from ${blue(`https://app.redoc.online/profile`)} and paste it below`)
    );
    await client.login(clientToken);
  }

  const startedAt = performance.now();
  const { entrypoint, destination, branchName, upsert } = argv;

  if (!validateDestination(destination!)) {
    exitWithError(`Destination argument value is not valid, please use the right format: ${yellow('<@organization-id/api-name@api-version>')}`);
  }

  const [ organizationId, apiName, apiVersion ] = getDestinationProps(destination!);
  const { version } = await getDefinitionVersion(organizationId, apiName, apiVersion);

  if (!version && !upsert) {
    exitWithError(`
      Definition is not exist!
      ${yellow('Suggestion:')} please use ${blue('-u')} or ${blue('--upsert')} to create definition.
    `);
  }

  if (version) {
    const { definitionId, id } = version;
    const updatePatch = await processFiles();
    await client.updateDefinitionVersion(definitionId, id, updatePatch);
  } else if (upsert) {
    const { organizationById } = await getOrganizationId(organizationId);
    if (!organizationById) { exitWithError('Organization not found'); }
    const { definitionByOrganizationIdAndName } = await getDefinitionByName(apiName, organizationId);

    let definitionId;
    if (!definitionByOrganizationIdAndName) {
      const { def } = await createDefinition(organizationId, apiName);
      definitionId = def.definition.id;
    } else {
      definitionId = definitionByOrganizationIdAndName.id;
    }
    const updatePatch = await processFiles();
    await createDefinitionVersion(definitionId, apiVersion, "FILE", updatePatch.source, '');
  }

  process.stderr.write(`Definition: ${blue(entrypoint!)} is successfully pushed to Redocly API Registry \n`);
  printExecutionTime('push', startedAt, entrypoint!);

  function getOrganizationId(organizationId: string) {
    return client.query(`
      query ($organizationId: String!) {
        organizationById(id: $organizationId) {
          id
        }
      }
    `, {
      organizationId
    });
  }

  function getDefinitionByName(name: string, organizationId: string) {
    return client.query(`
      query ($name: String!, $organizationId: String!) {
        definitionByOrganizationIdAndName(name: $name, organizationId: $organizationId) {
          id
        }
      }
    `, {
      name,
      organizationId
    });
  }

  function createDefinition(organizationId: string, name: string) {
    return client.query(`
      mutation CreateDefinition($organizationId: String!, $name: String!) {
        def: createDefinition(input: {organizationId: $organizationId, name: $name }) {
          definition {
            id
            nodeId
            name
          }
        }
      }
    `, {
      organizationId,
      name
    })
  }

  function createDefinitionVersion(definitionId: string, name: string, sourceType: string, source: any, description: string) {
    return client.query(`
      mutation CreateVersion($definitionId: Int!, $name: String!, $sourceType: DvSourceType!, $source: JSON, $description: String!) {
        createDefinitionVersion(input: {definitionId: $definitionId, name: $name, sourceType: $sourceType, source: $source, description: $description}) {
          definitionVersion {
            id
          }
        }
      }
    `, {
      definitionId,
      name,
      sourceType,
      source,
      description
    });
  }

  function getSignedUrl(organizationId: string, filesHash: string, fileName: string) {
    return client.query(`
      query ($organizationId: String!, $filesHash: String!, $fileName: String!) {
        signFileUploadCLI(organizationId: $organizationId, filesHash: $filesHash, fileName: $fileName) {
          signedFileUrl
          uploadedFilePath
        }
      }
    `, {
      organizationId,
      filesHash,
      fileName
    })
  }

  function getDefinitionVersion(organizationId: string, definitionName: string, versionName: string) {
    return client.query(`
      query ($organizationId: String!, $definitionName: String!, $versionName: String!) {
        version: definitionVersionByOrganizationDefinitionAndName(organizationId: $organizationId, definitionName: $definitionName, versionName: $versionName) {
          id
          definitionId
        }
      }
    `, {
      organizationId,
      definitionName,
      versionName
    });
  }

  async function processFiles() {
    let source: Source = { files: [], branchName };
    const filesPaths = await collectFilePaths(entrypoint!);
    const filesHash = createHashFromFiles(filesPaths.files);

    for await (let file of filesPaths.files) {
      const fileName = getRalativePath(file, getFilename(filesPaths.folder));
      const { signFileUploadCLI } = await getSignedUrl(organizationId, filesHash, fileName);
      const { signedFileUrl, uploadedFilePath } = signFileUploadCLI;
      if (file === filesPaths.root) { source['root'] = uploadedFilePath; }
      source.files.push(uploadedFilePath);
      await uploadFileToS3(signedFileUrl, entrypoint!);
    }

    return {
      sourceType: "FILE",
      source: JSON.stringify(source)
    }
  }
}

function getConfigPath(folder: string) {
  if (fs.existsSync(`${folder}/.redocly.yaml`)) {
    return `${folder}/.redocly.yaml`;
  } else if (fs.existsSync(`${folder}/.redocly.yml`)) {
    return `${folder}/.redocly.yml`;
  } else {
    return undefined;
  }
}

function getFilesList(dir: string) {
  const files = [];
  const filesAndDirs = fs.readdirSync(dir);
  for (const name of filesAndDirs) {
    const currentPath = dir + '/' + name;
    files.push(currentPath);
  }
  return files;
}

async function collectFilePaths(entrypoint: string) {
  let files: string[] = [];
  const entrypointPath = path.resolve(entrypoint);
  files.push(entrypointPath);

  const entrypointFolder = getFolder(entrypoint);
  const configPath = getConfigPath(entrypointFolder);
  if (configPath) {
    const config: Config = await loadConfig(configPath);
    files.push(configPath);
    if (config.referenceDocs.htmlTemplate) {
      const htmlDir = getFilename(getFolder(config.referenceDocs.htmlTemplate));
      const dir = entrypointFolder +'/'+ htmlDir;
      const fileList = getFilesList(dir);
      if (fileList.length) {
        files = files.concat(fileList);
      }
    }
    if (config.rawConfig && config.rawConfig.lint && config.rawConfig.lint.plugins) {
      config.rawConfig.lint.plugins.forEach(plugin => {
        // @ts-ignore
        files = files.concat(entrypointFolder + '/' + getRalativePath(plugin));
      });
    }
  }
  return {
    files,
    folder: entrypointFolder,
    root: entrypointPath
  }
}

function getFolder(filePath: string) {
  return path.resolve(path.dirname(filePath));
}

function getFilename(filePath: string) {
  return path.basename(filePath);
}

function getRalativePath(filePath: string, from: string = process.cwd()) {
  return path.relative(from, filePath);
}

function createHashFromFiles(filePaths: string[]) {
  let sum = createHash('sha256');
  filePaths.forEach(file => sum.update(fs.readFileSync(file)));
  return sum.digest('hex');
}

function validateDestination(destination: string) {
  const regexp = /^@+[a-zA-Z0-9-_]{1,}\/+[a-zA-Z0-9-_]{1,}@[a-zA-Z0-9-_]{1,}$/g;
  return regexp.test(destination);
}

function getDestinationProps(destination: string) {
  return destination.substring(1).split(/[@\/]/);
}

function uploadFileToS3(url: string, entrypoint: string) {
  const stats = fs.statSync(entrypoint!);
  const fileSizeInBytes = stats.size;
  let readStream = fs.createReadStream(entrypoint!);
  return fetch(url, {
    method: 'PUT',
    // @ts-ignore
    headers: {
      'Content-length': fileSizeInBytes
    },
    body: readStream
  })
}
