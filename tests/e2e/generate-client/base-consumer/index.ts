import { createPet, getPetById, listPets } from './api.js';

async function main(): Promise<void> {
  const pet = await getPetById(1);

  // deepObject query param: the object is serialized as filter[name]=…&filter[status]=…
  const filtered = await listPets({ filter: { name: 'rex', status: 'available' } });

  // Bucket C: the create body is `Omit<Pet, "id">`, so the readOnly server-assigned
  // `id` is neither required nor accepted — this call compiles without it.
  const created = await createPet({ name: 'rex', status: 'available' });

  // Bucket B: `metadata` is a free-form record (`{ [key: string]: unknown }`), so an
  // arbitrary key is accessible. Were it emitted as `{}`, this line would not compile.
  const note = pet.metadata?.['note'] ?? null;

  process.stdout.write(JSON.stringify({ pet, filtered, created, note }) + '\n');
}

main().catch((error) => {
  process.stderr.write(`UNHANDLED: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
