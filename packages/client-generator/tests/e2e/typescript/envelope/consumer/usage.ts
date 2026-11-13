import { client, createCustomer, listCustomers } from './client.js';

export async function bodyOnly() {
  const rows = await listCustomers();
  return rows.map((row) => row.id);
}

// Options that never mention `envelope` keep the plain body type.
export async function bodyWithOptions() {
  const rows = await listCustomers({}, { headers: { 'X-Trace': '1' } });
  const viaClientRows = await client.listCustomers({}, { parseAs: 'json' });
  return rows.map((row) => row.id).concat(viaClientRows.map((row) => row.id));
}

// Flat sugar: no-input ops take `init` as the first argument.
export async function withEnvelope() {
  const { data, headers, response } = await listCustomers({}, { envelope: true });
  const total: number = headers.paginationTotal;
  const flag: boolean | undefined = headers.xFlag;
  const secure: boolean = headers._3dSecure;
  const ids: string | undefined = headers.xIds;
  const raw = response.headers.get('X-Undocumented');
  return { rows: data.map((row) => row.id), total, flag, secure, ids, raw };
}

// Instance client uses the grouped args + trailing init shape.
export async function viaClient() {
  const { data, headers } = await client.listCustomers({}, { envelope: true });
  return { data, total: headers.paginationTotal };
}

export async function bodylessResponse() {
  const { data, headers } = await createCustomer({ path: { id: 'cus_1' } }, { envelope: true });
  const nothing: void = data;
  const location: string = headers.location;
  return { nothing, location };
}

export async function widenedEnvelopeOption() {
  const options = { envelope: true };
  const result = await listCustomers({}, options);
  return 'response' in result ? result.data.length : result.length;
}

export async function widenedClientOption() {
  const options = { envelope: true };
  const result = await client.listCustomers({}, options);
  return 'response' in result ? result.data.length : result.length;
}
