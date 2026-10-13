// Runtime smoke for stream request bodies in the generated Go SDK. Run by
// stream-bodies.test.ts (`go run .`) with the echo server's base URL as the only
// argument. It only makes the calls, in a fixed order; the test reads what the
// server received.
package main

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"

	client "stream.test/client"
)

const multipart = "--redocly\r\nContent-Disposition: form-data; name=\"note\"\r\n\r\nhello stream\r\n--redocly--\r\n"

func allBytes() []byte {
	payload := make([]byte, 256)
	for index := range payload {
		payload[index] = byte(index)
	}
	return payload
}

// pipe hands the payload over as an io.Pipe: a reader of unknown length that can be
// read once, so the client cannot measure or buffer it.
func pipe(payload []byte) io.Reader {
	reader, writer := io.Pipe()
	go func() {
		writer.Write(payload)
		writer.Close()
	}()
	return reader
}

func expectUnavailable(err error) {
	var apiErr *client.APIError
	if !errors.As(err, &apiErr) || apiErr.Status != 503 {
		panic(fmt.Sprintf("expected a 503 APIError, got %v", err))
	}
}

func main() {
	ctx := context.Background()
	serverURL := os.Args[1]
	binary := allBytes()
	api := client.New(client.Config{
		ServerURL: serverURL,
		Retry: client.RetryConfig{
			Retries:    2,
			RetryDelay: time.Millisecond,
			RetryOn:    func(int, *http.Response, error) bool { return true },
		},
	})

	// Streams: the body passes through untouched and is sent once, even under /fail/.
	if err := api.Upload(ctx, pipe([]byte(multipart))); err != nil {
		panic(err)
	}
	if err := api.UploadBlob(ctx, "declared", pipe(binary)); err != nil {
		panic(err)
	}
	expectUnavailable(api.UploadFailing(ctx, "stream", pipe(binary)))

	// Replayable bodies: the caller's Content-Type wins, and the retry policy still applies.
	// Headers are per client in Go, so the caller's Content-Type comes from a second one.
	custom := client.New(client.Config{
		ServerURL: serverURL,
		Headers:   map[string]string{"content-type": "application/x-custom"},
	})
	if err := custom.UploadBlob(ctx, "custom", binary); err != nil {
		panic(err)
	}
	expectUnavailable(api.UploadFailing(ctx, "bytes", binary))

	fmt.Println("GO_SMOKE_OK")
}
