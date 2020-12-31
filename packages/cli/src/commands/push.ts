import * as fs from 'fs';
import * as path from 'path';
import fetch from 'node-fetch';
import { performance } from 'perf_hooks';
import { yellow, green, blue } from 'colorette';
import { createHash } from 'crypto';
import { Config, loadConfig, RedoclyClient } from '@redocly/openapi-core';
import { promptUser, exitWithError, printExecutionTime, getFallbackEntryPointsOrExit } from '../utils';

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
       green(`\n  🔑 Copy your access token from ${blue('https://app.redoc.ly/profile')} and paste it below`)
    );
    await client.login(clientToken);
  }

  const startedAt = performance.now();
  const { entrypoint, destination, branchName, upsert } = argv;

  if (!validateDestination(destination!)) {
    exitWithError(`Destination argument value is not valid, please use the right format: ${yellow('<@organization-id/api-name@api-version>')}`);
  }

  const [ organizationId, apiName, apiVersion ] = getDestinationProps(destination!);
  await doesOrganizationExist(organizationId);
  const { version } = await client.getDefinitionVersion(organizationId, apiName, apiVersion);

  if (!version && !upsert) {
    exitWithError(`
  The definition version ${blue(apiName)}/${blue(apiVersion)} does not exist in organization ${blue(organizationId)}!
  ${yellow('Suggestion:')} please use ${blue('-u')} or ${blue('--upsert')} to create definition.
    `);
  }

  if (version) {
    const { definitionId, defaultBranch, id } = version;
    const updatePatch = await collectAndUploadFiles(branchName || defaultBranch.name);
    await client.updateDefinitionVersion(definitionId, id, updatePatch);
  } else if (upsert) {
    await doesOrganizationExist(organizationId);
    const { definition } = await client.getDefinitionByName(apiName, organizationId);
    let definitionId;
    if (!definition) {
      const { def } = await client.createDefinition(organizationId, apiName);
      definitionId = def.definition.id;
    } else {
      definitionId = definition.id;
    }
    const updatePatch = await collectAndUploadFiles(branchName || 'main');
    await client.createDefinitionVersion(definitionId, apiVersion, "FILE", updatePatch.source);
  }

  process.stderr.write(`Definition: ${blue(entrypoint!)} is successfully pushed to Redocly API Registry \n`);
  printExecutionTime('push', startedAt, entrypoint!);

  async function doesOrganizationExist(organizationId: string) {
    const { organizationById } = await client.getOrganizationId(organizationId);
    if (!organizationById) { exitWithError(`Organization ${blue(organizationId)} not found`); }
  }

  async function collectAndUploadFiles(branch: string) {
    let source: Source = { files: [], branchName: branch };
    const filesToUpload = await collectFilesToUpload(entrypoint!);
    const filesHash = hashFiles(filesToUpload.files);

    process.stdout.write(`Uploading ${filesToUpload.files.length}: \n`);

    process.stdout.write(filesToUpload.files.join('\n  - '));

    for (let file of filesToUpload.files) {
      const { signFileUploadCLI } = await client.getSignedUrl(organizationId, filesHash, file.keyOnS3);
      const { signedFileUrl, uploadedFilePath } = signFileUploadCLI;
      if (file.filePath === filesToUpload.root) { source['root'] = uploadedFilePath; }
      source.files.push(uploadedFilePath);
      await uploadFileToS3(signedFileUrl, file.filePath);
    }
    return {
      sourceType: "FILE",
      source: JSON.stringify(source)
    }
  }
}

function getFilesList(dir: string, files?: any) {
  files = files || [];
  const filesAndDirs = fs.readdirSync(dir);
  for (const name of filesAndDirs) {
    if (fs.statSync(path.join(dir, name)).isDirectory()) {
      files = getFilesList(path.join(dir, name), files);
    } else {
      const currentPath = dir + '/' + name;
      files.push(currentPath);
    }
  }
  return files;
}

async function collectFilesToUpload(entrypoint: string) {
  let files: { filePath: string, keyOnS3: string }[] = [];
  const config: Config = await loadConfig();
  const entrypoints = await getFallbackEntryPointsOrExit([entrypoint], config);
  const entrypointPath = entrypoints[0];
  files.push(getFileEntry(entrypointPath));

  if (config.configFile) {
    files.push(getFileEntry(config.configFile));
    if (config.referenceDocs.htmlTemplate) {
      const dir = getFolder(config.referenceDocs.htmlTemplate);
      const fileList = getFilesList(dir, []);
      files.push(...fileList.map(getFileEntry));
    }
    if (config.rawConfig && config.rawConfig.lint && config.rawConfig.lint.plugins) {
      for (const plugin of config.rawConfig.lint.plugins) {
        if (typeof plugin !== 'string') continue;
        files.push(getFileEntry(plugin));
      }
    }
  }
  return {
    files,
    root: path.resolve(entrypointPath),
  }

  function getFileEntry(filename: string) {
    return {
      filePath: path.resolve(filename),
      keyOnS3: config.configFile
        ? path.relative(path.dirname(config.configFile), filename)
        : path.basename(filename)
    }
  }
}

function getFolder(filePath: string) {
  return path.resolve(path.dirname(filePath));
}

function hashFiles(filePaths: { filePath: string }[]) {
  let sum = createHash('sha256');
  filePaths.forEach(file => sum.update(fs.readFileSync(file.filePath)));
  return sum.digest('hex');
}

function validateDestination(destination: string) {
  const regexp = /^@+[a-zA-Z0-9-_]{1,}\/+[a-zA-Z0-9-_ ]{1,}@[a-zA-Z0-9-_ ]{1,}$/g;
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
