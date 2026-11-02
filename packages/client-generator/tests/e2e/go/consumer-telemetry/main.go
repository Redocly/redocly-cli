// Usage telemetry consumer for the generated Go SDK. Built and run by
// go/telemetry.test.ts with the API base URL, the telemetry sink URL, and an optional
// `registered`, which registers the telemetry for every client instead of passing it.
package main

import (
	"context"
	"os"
	"time"

	client "telemetry.test/client"
)

func main() {
	ctx := context.Background()
	telemetry := client.NewUsageTelemetry(client.UsageTelemetryOptions{
		SDKName:    "@acme/pets-sdk",
		SDKVersion: "1.0.0",
		Client:     "pets-worker/2.0.0",
		Endpoint:   os.Args[2],
	})
	registered := len(os.Args) > 3 && os.Args[3] == "registered"
	config := client.Config{
		ServerURL: os.Args[1],
		Retry:     client.RetryConfig{Retries: 1, RetryDelay: time.Millisecond},
	}
	if registered {
		telemetry.Register()
	} else {
		config.Middleware = []client.Middleware{telemetry.Middleware()}
	}
	api := client.New(config)
	for i := 0; i < 2; i++ {
		if _, err := api.ListPets(ctx, nil); err != nil {
			panic(err)
		}
	}
	// A failed first send keeps its counts, and the second flush sends them.
	for i := 0; i < 2; i++ {
		flush := telemetry.Flush
		if registered {
			flush = client.FlushUsageTelemetry
		}
		if err := flush(ctx); err != nil {
			panic(err)
		}
	}
}
