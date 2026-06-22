// Consume the programmatically-generated client. The output is identical to the CLI's —
// programmatic generation only changes *how* you invoke the generator, not what it emits.
import { configure, listMenuItems } from './api/client';

configure({ baseUrl: 'https://api.cafe.redocly.com' });

export async function loadMenu() {
  return listMenuItems();
}
