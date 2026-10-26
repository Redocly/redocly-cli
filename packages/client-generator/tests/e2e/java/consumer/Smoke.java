// Runtime smoke for the generated Java SDK, exercised against the same Node mock
// server the other consumers use. Compiled and run by java/client.test.ts with the
// server base URL as the only argument.

import baseconsumer.Client;

public final class Smoke {
    public static void main(String[] args) {
        String base = args[0];
        Client api = new Client(new Client.Config().serverUrl(base));

        // Typed call: the response hydrates into the generated record.
        Client.Pet pet = api.getPetById(1L);
        if (pet.name() == null || pet.name().isEmpty()) {
            throw new IllegalStateException("pet.name should hydrate");
        }

        // Collection + request body round-trips.
        api.listPets(null);
        api.createPet(new Client.Pet(null, "Smokey", null, null, null, null));

        // A non-2xx throws the structured ApiException (a wrong base path 404s every route).
        Client broken = new Client(new Client.Config().serverUrl(base + "/nowhere"));
        try {
            broken.getPetById(1L);
            throw new IllegalStateException("expected an ApiException");
        } catch (Client.ApiException error) {
            if (error.status != 404) {
                throw new IllegalStateException("expected 404, got " + error.status);
            }
        }

        System.out.println("JAVA_SMOKE_OK");
    }
}
