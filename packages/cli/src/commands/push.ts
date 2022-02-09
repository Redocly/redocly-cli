import * as fs from 'fs';
import * as path from 'path';
import fetch from 'node-fetch';
import { performance } from 'perf_hooks';
import { yellow, green, blue } from 'colorette';
import { createHash } from 'crypto';
import {
  bundle,
  Config,
  loadConfig,
  RedoclyClient,
  IGNORE_FILE,
  BundleOutputFormat,
  getTotals,
  slash,
  Region,
} from '@redocly/openapi-core';
import {
  exitWithError,
  printExecutionTime,
  getFallbackEntryPointsOrExit,
  pluralize,
  dumpBundle,
} from '../utils';
import { promptClientToken } from './login';

export async function handlePush(argv: {
  entrypoint?: string;
  destination?: string;
  branchName?: string;
  upsert?: boolean;
  'run-id'?: string;
  region?: Region;
}) {
  const region = argv.region || (await loadConfig()).region;
  const client = new RedoclyClient(region);
  const isAuthorized = await client.isAuthorizedWithRedoclyByRegion();
  if (!isAuthorized) {
    const clientToken = await promptClientToken(client.domain);
    await client.login(clientToken);
  }

  const startedAt = performance.now();
  const { entrypoint, destination, branchName, upsert } = argv;

  if (!validateDestination(destination!)) {
    exitWithError(
      `Destination argument value is not valid, please use the right format: ${yellow(
        '<@organization-id/api-name@api-version>',
      )}`,
    );
  }

  const [organizationId, name, version] = getDestinationProps(destination!);

  try {
    let rootFilePath = '';
    const filePaths: string[] = [];
    const filesToUpload = await collectFilesToUpload(entrypoint!);
    const filesHash = hashFiles(filesToUpload.files);

    process.stdout.write(
      `Uploading ${filesToUpload.files.length} ${pluralize('file', filesToUpload.files.length)}:\n`,
    );

    let uploaded = 0;

    for (let file of filesToUpload.files) {
      const { signedUploadUrl, filePath } = await client.registryApi.prepareFileUpload({
        organizationId,
        name,
        version,
        filesHash,
        filename: file.keyOnS3,
        isUpsert: upsert,
      });

      if (file.filePath === filesToUpload.root) {
        rootFilePath = filePath;
      }

      filePaths.push(filePath);

      process.stdout.write(
        `Uploading ${file.contents ? 'bundle for ' : ''}${blue(file.filePath)}...`,
      );

      const uploadResponse = await uploadFileToS3(signedUploadUrl, file.contents || file.filePath);

      const fileCounter = `(${++uploaded}/${filesToUpload.files.length})`;

      if (!uploadResponse.ok) {
        exitWithError(`✗ ${fileCounter}\nFile upload failed\n`);
      }

      process.stdout.write(green(`✓ ${fileCounter}\n`));
    }

    process.stdout.write('\n');

    await client.registryApi.pushApi({
      organizationId,
      name,
      version,
      rootFilePath,
      filePaths,
      branch: branchName,
      isUpsert: upsert,
    });
  } catch (error) {
    if (error.message === 'ORGANIZATION_NOT_FOUND') {
      exitWithError(`Organization ${blue(organizationId)} not found`);
    }

    if (error.message === 'API_VERSION_NOT_FOUND') {
      exitWithError(`The definition version ${blue(name)}/${blue(
        version,
      )} does not exist in organization ${blue(organizationId)}!\n${yellow(
        'Suggestion:',
      )} please use ${blue('-u')} or ${blue('--upsert')} to create definition.
    `);
    }

    throw error;
  }

  process.stdout.write(
    `Definition: ${blue(entrypoint!)} is successfully pushed to Redocly API Registry \n`,
  );
  printExecutionTime('push', startedAt, entrypoint!);
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
  let files: { filePath: string; keyOnS3: string; contents?: Buffer }[] = [];
  const config: Config = await loadConfig();
  const entrypoints = await getFallbackEntryPointsOrExit([entrypoint], config);
  const entrypointPath = entrypoints[0].path;

  process.stdout.write('Bundling definition\n');

  const { bundle: openapiBundle, problems } = await bundle({
    config,
    ref: entrypointPath,
    skipRedoclyRegistryRefs: true,
  });

  const fileTotals = getTotals(problems);

  if (fileTotals.errors === 0) {
    process.stdout.write(
      `Created a bundle for ${blue(entrypoint)} ${
        fileTotals.warnings > 0 ? 'with warnings' : ''
      }\n`,
    );
  } else {
    exitWithError(`Failed to create a bundle for ${blue(entrypoint)}\n`);
  }

  const fileExt = path.extname(entrypointPath).split('.').pop();
  files.push(
    getFileEntry(entrypointPath, dumpBundle(openapiBundle.parsed, fileExt as BundleOutputFormat)),
  );

  if (fs.existsSync('package.json')) {
    files.push(getFileEntry('package.json'));
  }
  if (fs.existsSync(IGNORE_FILE)) {
    files.push(getFileEntry(IGNORE_FILE));
  }
  if (config.configFile) {
    files.push(getFileEntry(config.configFile));
    if (config.referenceDocs.htmlTemplate) {
      const dir = getFolder(config.referenceDocs.htmlTemplate);
      const fileList = getFilesList(dir, []);
      files.push(...fileList.map((f) => getFileEntry(f)));
    }
    if (config.rawConfig && config.rawConfig.lint && config.rawConfig.lint.plugins) {
      let pluginFiles = new Set<string>();
      for (const plugin of config.rawConfig.lint.plugins) {
        if (typeof plugin !== 'string') continue;
        const fileList = getFilesList(getFolder(plugin), []);
        fileList.forEach((f) => pluginFiles.add(f));
      }
      files.push(...filterPluginFilesByExt(Array.from(pluginFiles)).map((f) => getFileEntry(f)));
    }
  }
  return {
    files,
    root: path.resolve(entrypointPath),
  };

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
      contents: (contents && Buffer.from(contents, 'utf-8')) || undefined,
    };
  }
}

function getFolder(filePath: string) {
  return path.resolve(path.dirname(filePath));
}

function hashFiles(filePaths: { filePath: string }[]) {
  let sum = createHash('sha256');
  filePaths.forEach((file) => sum.update(fs.readFileSync(file.filePath)));
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
  const fileSizeInBytes =
    typeof filePathOrBuffer === 'string'
      ? fs.statSync(filePathOrBuffer).size
      : filePathOrBuffer.byteLength;
  let readStream =
    typeof filePathOrBuffer === 'string' ? fs.createReadStream(filePathOrBuffer) : filePathOrBuffer;

  return fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Length': fileSizeInBytes.toString(),
    },
    body: readStream,
  });
}
