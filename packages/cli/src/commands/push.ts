import * as fs from 'fs';
import * as path from 'path';
import fetch from 'node-fetch';
import { yellow, green, blue } from 'colorette';
import { createHash } from 'crypto';
import { RedoclyClient } from '@redocly/openapi-core';
import { promptUser, exitWithError } from '../utils';

export async function handlePush (argv: {
  entrypoint?: string;
  destination?: string;
  branchName?: string;
  upsert?: boolean;
  'run-id'?: string;
}) {
  const clientToken = await promptUser(
    green(`\n  🔑 Copy your access token from ${blue(`https://app.redoc.online/profile`)} and paste it below`)
  );
  const client = new RedoclyClient();
  await client.login(clientToken);
  const { entrypoint, destination, branchName } = argv;

  if (!validateDestination(destination!)) {
    exitWithError(`Destination argument value is not valid, please use the right format: ${yellow('<@organization-id/api-name@api-version>')}`);
  }

  const [ organizationId, apiName, apiVersion ] = getDestinationProps(destination!);
  const filesPaths = collectFilePaths(entrypoint!);
  const filesHash = createHashFromFiles(filesPaths);
  const fileName = getFilename(entrypoint!);
  const { signFileUploadCLI } = await getSignedUrl(organizationId, filesHash, fileName);
  const { signedFileUrl, uploadedFilePath } = signFileUploadCLI;
  await uploadFileToS3(signedFileUrl, entrypoint!);
  const { version } = await getDefinitionId(organizationId, apiName, apiVersion);
  const { definitionId, id } = version;
  const updatePatch = {
    "sourceType": "FILE",
    "source": JSON.stringify({
      files: [uploadedFilePath],
      root: uploadedFilePath,
      branchName
    })
  }
  await client.updateDefinitionVersion(definitionId, id, updatePatch);

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

  function getDefinitionId(organizationId: string, definitionName: string, versionName: string) {
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
    })
  }
}

function collectFilePaths(entrypoint: string) {
  return [entrypoint];
}

function getFilename(filePath: string) {
  return path.basename(filePath);
}

function createHashFromFiles(filePaths: string[]) {
  let sum = createHash('sha256');
  filePaths.forEach(file => sum.update(fs.readFileSync(file)));
  return sum.digest('hex');
}

function validateDestination(destination: string) {
  const regexp = /^@+[a-zA-Z0-9-_]{3,}\/+[a-zA-Z0-9-_]{3,}@[a-zA-Z0-9-_]{2,}$/g;
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
