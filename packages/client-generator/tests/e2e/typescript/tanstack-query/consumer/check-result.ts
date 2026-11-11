import { useMutation, useQuery } from '@tanstack/react-query';

import { getPetById, type Pet } from './result-client.js';
import { createPetMutation, getPetByIdOptions } from './result-client.tanstack.js';

export function useGetPet(id: number) {
  const query = useQuery(getPetByIdOptions({ path: { id } }));
  // The wrapper unwraps the result: cached data is the plain body in both error modes.
  const pet: Pet | undefined = query.data;
  return pet;
}

export function useCreatePet() {
  return useMutation(createPetMutation());
}

// The sdk itself keeps the result shape.
export async function loadPet(id: number) {
  const { data, error, response } = await getPetById({ path: { id } });
  return { data, error, status: response.status };
}
