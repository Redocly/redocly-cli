// Runtime smoke for the generated Go SDK, exercised against the same Node mock
// server the other consumers use. Built and run by go.test.ts with the server
// base URL as the only argument.
package main

import (
	"context"
	"errors"
	"fmt"
	"os"

	client "smoke.test/client"
)

func main() {
	ctx := context.Background()
	api := client.New(client.Config{ServerURL: os.Args[1]})

	// Typed call: the response decodes into the generated struct.
	pet, err := api.GetPetById(ctx, 1)
	if err != nil {
		panic(err)
	}
	if pet.Name == "" {
		panic("pet.Name should hydrate")
	}

	// Collection + request body round-trips.
	if _, err := api.ListPets(ctx, nil); err != nil {
		panic(err)
	}
	if _, err := api.CreatePet(ctx, client.Pet{Name: "Smokey"}); err != nil {
		panic(err)
	}

	// A non-2xx returns the structured *APIError (a wrong base path 404s every route).
	broken := client.New(client.Config{ServerURL: os.Args[1] + "/nowhere"})
	_, err = broken.GetPetById(ctx, 1)
	var apiErr *client.APIError
	if !errors.As(err, &apiErr) || apiErr.Status != 404 {
		panic(fmt.Sprintf("expected a 404 APIError, got %v", err))
	}

	fmt.Println("GO_SMOKE_OK")
}
