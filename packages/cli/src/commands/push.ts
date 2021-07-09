import * as fs from 'fs';
import * as path from 'path';
import fetch from 'node-fetch';
import { performance } from 'perf_hooks';
import { yellow, green, blue } from 'colorette';
import { createHash } from 'crypto';

import { bundle, Config, loadConfig, RedoclyClient, IGNORE_FILE, BundleOutputFormat, getTotals } from '@redocly/openapi-core';
import {
  promptUser,
  exitWithError,
  printExecutionTime,
  getFallbackEntryPointsOrExit,
  pluralize,
  dumpBundle,
  slash
} from '../utils';

type Source = {
  files: string[];
  branchName?: string;
  root?: string;
}

const PUSH_SOURCE_TYPE = 'CICD';

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
       green(`\n  🔑 Copy your API key from ${blue('https://app.redoc.ly/profile')} and paste it below`),
       true
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
    await client.createDefinitionVersion(definitionId, apiVersion, PUSH_SOURCE_TYPE, updatePatch.source);
  }

  process.stdout.write(`Definition: ${blue(entrypoint!)} is successfully pushed to Redocly API Registry \n`);
  printExecutionTime('push', startedAt, entrypoint!);

  async function doesOrganizationExist(organizationId: string) {
    const { organizationById } = await client.getOrganizationId(organizationId);
    if (!organizationById) { exitWithError(`Organization ${blue(organizationId)} not found`); }
  }

  async function collectAndUploadFiles(branch: string) {
    let source: Source = { files: [], branchName: branch };
    const filesToUpload = await collectFilesToUpload(entrypoint!);
    const filesHash = hashFiles(filesToUpload.files);

    process.stdout.write(`Uploading ${filesToUpload.files.length} ${pluralize('file', filesToUpload.files.length)}:\n`);
    let uploaded = 0;
    for (let file of filesToUpload.files) {
      const { signFileUploadCLI } = await client.getSignedUrl(organizationId, filesHash, file.keyOnS3);
      const { signedFileUrl, uploadedFilePath } = signFileUploadCLI;
      if (file.filePath === filesToUpload.root) { source['root'] = uploadedFilePath; }
      source.files.push(uploadedFilePath);
      process.stdout.write(`Uploading ${file.contents ? 'bundle for ' : ''}${blue(file.filePath)}...`);
      const uploadResponse = await uploadFileToS3(signedFileUrl, file.contents || file.filePath);

      const fileCounter = `(${++uploaded}/${filesToUpload.files.length})`;

      if (!uploadResponse.ok) {
        exitWithError(`✗ ${fileCounter}\nFile upload failed\n`);
      }

      process.stdout.write(green(`✓ ${fileCounter}\n`));
    }

    process.stdout.write('\n');
    return {
      sourceType: PUSH_SOURCE_TYPE,
      source: JSON.stringify(source)
    }
  }
}

function getFilesList(dir: string, files?: any): string[] {
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
  let files: { filePath: string, keyOnS3: string, contents?: Buffer }[] = [];
  const config: Config = await loadConfig();
  const entrypoints = await getFallbackEntryPointsOrExit([entrypoint], config);
  const entrypointPath = entrypoints[0];

  process.stdout.write('Bundling definition\n');

  const {bundle: openapiBundle, problems} = await bundle({
    config,
    ref: entrypointPath
  });

  const fileTotals = getTotals(problems);

  if (fileTotals.errors === 0) {
    process.stdout.write(
      `Created a bundle for ${blue(entrypoint)} ${
        fileTotals.warnings > 0 ? 'with warnings' : ''
      }\n`
    );
  } else {
    exitWithError(`Failed to create a bundle for ${blue(entrypoint)}\n`)
  }

  const fileExt = path.extname(entrypointPath).split('.').pop();
  files.push(getFileEntry(entrypointPath, dumpBundle(openapiBundle.parsed, fileExt as BundleOutputFormat)));

  if (fs.existsSync('package.json')) { files.push(getFileEntry('package.json')); }
  if (fs.existsSync(IGNORE_FILE)) { files.push(getFileEntry(IGNORE_FILE)); }
  if (config.configFile) {
    files.push(getFileEntry(config.configFile));
    if (config.referenceDocs.htmlTemplate) {
      const dir = getFolder(config.referenceDocs.htmlTemplate);
      const fileList = getFilesList(dir, []);
      files.push(...fileList.map(f => getFileEntry(f)));
    }
    if (config.rawConfig && config.rawConfig.lint && config.rawConfig.lint.plugins) {
      let pluginFiles = new Set<string>();
      for (const plugin of config.rawConfig.lint.plugins) {
        if (typeof plugin !== 'string') continue;
        const fileList = getFilesList(getFolder(plugin), []);
        fileList.forEach(f => pluginFiles.add(f));
      }
      files.push(
        ...(filterPluginFilesByExt(Array.from(pluginFiles))).map(f => getFileEntry(f))
      );
    }
  }
  return {
    files,
    root: path.resolve(entrypointPath),
  }

  function filterPluginFilesByExt(files: string[]) {
    return files.filter((file: string) => {
      const fileExt = path.extname(file).toLowerCase();
      return fileExt === '.js' || fileExt === '.ts' || fileExt === '.mjs' || fileExt === 'json';
    });
  }

  function getFileEntry(filename: string, contents?: string) {
    return {
      filePath: path.resolve(filename),
      keyOnS3: config.configFile
        ? slash(path.relative(path.dirname(config.configFile), filename))
        : slash(path.basename(filename)),
      contents: contents && Buffer.from(contents, 'utf-8') || undefined,
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
  const regexp = /^@+[a-zA-Z0-9-_.& ]+\/+[^@\/]+@[^@\/]+$/g;
  return regexp.test(destination);
}

function getDestinationProps(destination: string) {
  return destination.substring(1).split(/[@\/]/);
}

function uploadFileToS3(url: string, filePathOrBuffer: string | Buffer) {
  const fileSizeInBytes = typeof filePathOrBuffer === 'string' ? fs.statSync(filePathOrBuffer).size : filePathOrBuffer.byteLength;
  let readStream = typeof filePathOrBuffer === 'string' ? fs.createReadStream(filePathOrBuffer) : filePathOrBuffer;

  return fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Length': fileSizeInBytes.toString()
    },
    body: readStream
  });
}
