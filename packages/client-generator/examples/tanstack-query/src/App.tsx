import { useQuery } from '@tanstack/react-query';

import { configure } from './api/client.js';
import { listMenuItemsOptions } from './api/client.tanstack.js';

configure({ serverUrl: 'https://api.cafe.redocly.com' });

export function App() {
  const { data, error, isLoading } = useQuery(listMenuItemsOptions({}));
  if (isLoading) return <p>Loading…</p>;
  if (error) return <p>Error: {String(error)}</p>;
  return <pre>{JSON.stringify(data, null, 2)}</pre>;
}
