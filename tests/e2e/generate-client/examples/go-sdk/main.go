// Consume the generated Go SDK: typed structs over the standard library.
package main

import (
	"context"
	"fmt"

	client "cafe.example/src/api"
)

func main() {
	api := client.New(client.Config{})
	limit := int64(3)
	menu, err := api.ListMenuItems(context.Background(), &client.ListMenuItemsParams{Limit: &limit})
	if err != nil {
		panic(err)
	}
	for _, item := range menu.Items {
		if fields, ok := item.(map[string]any); ok {
			fmt.Println(fields["name"])
		}
	}
}
