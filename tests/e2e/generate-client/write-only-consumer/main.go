// Runtime smoke for write-only properties in the generated Go SDK. Run by
// write-only.test.ts (`go run .`) with the server's base URL as the only argument. The
// request sends the password; the response comes back without it, and the field stays nil.
package main

import (
	"context"
	"fmt"
	"os"

	client "writeonly.test/client"
)

func main() {
	api := client.New(client.Config{ServerURL: os.Args[1]})
	password := "correct horse"
	customer, err := api.CreateCustomer(context.Background(), client.Customer{
		Email:    "ada@example.com",
		Password: &password,
	})
	if err != nil {
		panic(err)
	}
	if customer.Password != nil {
		panic(fmt.Sprintf("expected no password, got %q", *customer.Password))
	}

	fmt.Printf("%+v\n", customer)
	fmt.Println("GO_SMOKE_OK")
}
