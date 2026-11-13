import { useMutation, useQuery } from '@tanstack/react-query';

import type { Pet } from './client.js';
import { createPetMutation, getPetByIdOptions, listPetsOptions } from './client.tanstack.js';

export function useGetPet(id: number) {
  const query = useQuery(getPetByIdOptions({ path: { id } }));
  // Wrapper inits exclude `envelope`: cached data is the plain body, never an envelope.
  const pet: Pet | undefined = query.data;
  return pet;
}

export function useListPets() {
  return useQuery(listPetsOptions({ query: { filter: { name: 'rex' } } }));
}

export function useCreatePet() {
  return useMutation(createPetMutation());
}
