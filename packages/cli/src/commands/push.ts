import * as fs from 'fs';
import fetch from 'node-fetch';
import { yellow, green, blue } from 'colorette';
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
  const { entrypoint, destination } = argv;

  if (!validateDestination(destination!)) {
    exitWithError(`Destination argument value is not valid, please use the right format: ${yellow('<@organization-id/api-name@api-version>')}`);
  }

  const [ organizationId, apiName, apiVersion ] = getDestinationProps(destination!);
  const signedUrl = await getSignedUrl();
  await uploadFileToS3(signedUrl, entrypoint!);

  const { version } = await getDefinitionId(client, organizationId, apiName, apiVersion);
  const { definitionId, id } = version;
  const updatePatch = {
    "sourceType": "FILE",
    "source": JSON.stringify({ files:['spec.yaml'], root: 'spec.yaml', branchName: "test"})
  }

  // @ts-ignore
  await client.updateDefinitionVersion(definitionId, id, updatePatch);
}

function validateDestination(destination: string) {
  const regexp = /^@+[a-zA-Z0-9-_]{3,}\/+[a-zA-Z0-9-_]{3,}@[a-zA-Z0-9-_]{2,}$/g;
  return regexp.test(destination);
}

function getDestinationProps(destination: string) {
  return destination.substring(1).split(/[@\/]/);
}

function getDefinitionId(client: any, organizationId: string, definitionName: string, versionName: string) {
  return client.query(`
    query ($orgId: String!, $definitionName: String!, $versionName: String!) {
      version: definitionVersionByOrganizationDefinitionAndName(organizationId: $orgId, definitionName: $definitionName, versionName: $versionName) {
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

function getSignedUrl() {
    // return query(`
    //   Query {
    //     signFileUploadCLI(fileName: "pets.yaml")
    //   }
    // `)
  return 'https://dev-redocly-specs.s3.amazonaws.com/spec.yaml?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIA27RK5XRJNVVP7OVO%2F20201104%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20201104T140939Z&X-Amz-Expires=60000&X-Amz-Signature=1264aa8fca6bf295f9a4c4dc709287e71811bd0df2c126484e4dfd95ab3236b5&X-Amz-SignedHeaders=host';
}

function uploadFileToS3(url: string, entrypoint: string) {
  const stats = fs.statSync(entrypoint!);
  const fileSizeInBytes = stats.size;
  let readStream = fs.createReadStream(entrypoint!);
  return fetch(url, {
    method: 'PUT',
    //@ts-ignore
    headers: { "Content-length": fileSizeInBytes },
    body: readStream
  })
}
