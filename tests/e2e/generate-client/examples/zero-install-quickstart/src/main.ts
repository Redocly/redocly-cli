// zero-install-quickstart — the whole loop: generate → import → call.
//
// `redocly generate-client` turned openapi.yaml into ONE self-contained file
// (src/api/client.ts) with zero runtime dependencies — there is no client
// library to install or keep in sync. Import the generated functions and call.
import { getMenuItemPhoto, listMenuItems } from './api/client.js';

const menu = await listMenuItems({ limit: 3 });
for (const item of menu.items) {
  console.log(`${item.name} — $${(item.price / 100).toFixed(2)}`);
}

const [first] = menu.items;
if (first) {
  const photo = await getMenuItemPhoto(first.id, { photoSize: 'thumbnail' });
  console.log(
    photo instanceof Blob ? `${first.name} photo: ${photo.type}, ${photo.size} bytes` : photo
  );
}
