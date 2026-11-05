// Usage telemetry for a generated Go SDK, written beside the client by
// `client.telemetry: on`. It counts calls per operation through the runtime's
// OnSettled hook and sends one event per operation and window. An event holds
// only the operation id, the counts, the window, and the SDK identity.
package client

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"net/http"
	"os"
	"runtime"
	"strconv"
	"strings"
	"sync"
	"time"
)

const (
	usageTelemetryGeneratorVersion = "dev"
	usageTelemetryEndpoint         = "https://otel.cloud.redocly.com/v1/traces"
	usageTelemetryEventType        = "com.redocly.sdkUsage.aggregated"
	usageTelemetryServiceName      = "redocly-sdk"
	usageTelemetrySendTimeout      = 3 * time.Second
	usageTelemetrySDKURNPrefix     = "urn:redocly:cli:sdk:go:"
	usageTelemetryCrockfordBase32  = "0123456789abcdefghjkmnpqrstvwxyz"
)

// usageTelemetryRegistered holds each UsageTelemetry that Register added.
var usageTelemetryRegistered []*UsageTelemetry

var usageTelemetryLatencyBuckets = []struct {
	name    string
	belowMs int64
}{
	{"lt_100ms", 100},
	{"lt_300ms", 300},
	{"lt_1s", 1000},
	{"lt_3s", 3000},
	{"lt_10s", 10000},
	{"gte_10s", math.MaxInt64},
}

// UsageTelemetryOptions identifies the SDK. Endpoint defaults to the Redocly
// OpenTelemetry endpoint and FlushInterval to one minute. Sink, when set,
// receives the events instead of a send; an error it returns keeps the counts.
type UsageTelemetryOptions struct {
	SDKName       string
	SDKVersion    string
	Client        string
	Endpoint      string
	Sink          func(events []UsageTelemetryEvent) error
	FlushInterval time.Duration
}

// UsageTelemetryEvent is one com.redocly.sdkUsage.aggregated CloudEvent: the counts
// of one operation in one window. Data holds the operation, then the SDK; their values
// are strings or int64. Time is the window start in RFC 3339 with milliseconds. The
// OpenTelemetry collector sets the env of the event. The json tags give a Sink that
// marshals an event the CloudEvent field names, as in the other languages.
type UsageTelemetryEvent struct {
	ID              string           `json:"id"`
	Object          string           `json:"object"`
	SpecVersion     string           `json:"specversion"`
	DataContentType string           `json:"datacontenttype"`
	Type            string           `json:"type"`
	Source          string           `json:"source"`
	Time            string           `json:"time"`
	Origin          string           `json:"origin"`
	Category        string           `json:"category"`
	Signal          string           `json:"signal"`
	Data            []map[string]any `json:"data"`
}

type usageTelemetryCounts struct {
	calls         int64
	attempts      int64
	durationSumMs int64
	status        map[string]int64
	latency       map[string]int64
}

// UsageTelemetry counts the calls of every client whose Config.Middleware holds
// its Middleware(). It is safe for concurrent use.
type UsageTelemetry struct {
	options     UsageTelemetryOptions
	sdk         map[string]any
	mu          sync.Mutex
	counts      map[string]*usageTelemetryCounts
	windowStart time.Time
	timer       *time.Timer
	sending     sync.Mutex
}

// NewUsageTelemetry returns the counter. REDOCLY_SDK_TELEMETRY=off or
// DO_NOT_TRACK=1 turns it off: Middleware then has no hooks.
func NewUsageTelemetry(options UsageTelemetryOptions) *UsageTelemetry {
	if options.Endpoint == "" {
		options.Endpoint = usageTelemetryEndpoint
	}
	if options.FlushInterval <= 0 {
		options.FlushInterval = time.Minute
	}
	return &UsageTelemetry{
		options: options,
		sdk: map[string]any{
			"id":                options.SDKName,
			"object":            "sdk",
			"uri":               usageTelemetrySDKURNPrefix + options.SDKName,
			"version":           options.SDKVersion,
			"generator_version": usageTelemetryGeneratorVersion,
			"language":          "go",
			"runtime":           "go",
			"runtime_version":   strings.TrimPrefix(runtime.Version(), "go"),
			"client":            options.Client,
		},
		counts: map[string]*usageTelemetryCounts{},
	}
}

// Middleware is the hook to add to Config.Middleware.
func (t *UsageTelemetry) Middleware() Middleware {
	if usageTelemetryDisabled() {
		return Middleware{}
	}
	return Middleware{OnSettled: t.record}
}

// Register adds the middleware to every client of the package, also to a client created
// before. Call it once, before the first call, for example in an init function.
func (t *UsageTelemetry) Register() {
	registeredMiddleware = append(registeredMiddleware, t.Middleware())
	usageTelemetryRegistered = append(usageTelemetryRegistered, t)
}

// FlushUsageTelemetry flushes every UsageTelemetry that Register added, as Flush does.
// Go has no exit hook, so call it before the program ends.
func FlushUsageTelemetry(ctx context.Context) error {
	for _, telemetry := range usageTelemetryRegistered {
		if err := telemetry.Flush(ctx); err != nil {
			return err
		}
	}
	return nil
}

// Flush sends the open window and waits for the send, or for ctx.
// Go has no exit hook, so call it before the program ends.
func (t *UsageTelemetry) Flush(ctx context.Context) error {
	done := make(chan struct{})
	go func() {
		t.flushWindow()
		close(done)
	}()
	select {
	case <-done:
		return nil
	case <-ctx.Done():
		return ctx.Err()
	}
}

func usageTelemetryDisabled() bool {
	return os.Getenv("REDOCLY_SDK_TELEMETRY") == "off" || os.Getenv("DO_NOT_TRACK") == "1"
}

func (t *UsageTelemetry) record(call SettledCall) {
	t.mu.Lock()
	defer t.mu.Unlock()
	if len(t.counts) == 0 {
		t.openWindow()
	}
	operation := t.counts[call.OperationID]
	if operation == nil {
		operation = &usageTelemetryCounts{status: map[string]int64{}, latency: map[string]int64{}}
		t.counts[call.OperationID] = operation
	}
	durationMs := call.Duration.Milliseconds()
	operation.calls++
	operation.attempts += int64(call.Attempts)
	operation.durationSumMs += durationMs
	operation.status[usageTelemetryStatusClass(call)]++
	for _, bucket := range usageTelemetryLatencyBuckets {
		if durationMs < bucket.belowMs {
			operation.latency[bucket.name]++
			break
		}
	}
}

// openWindow must run with t.mu held.
func (t *UsageTelemetry) openWindow() {
	t.windowStart = time.Now()
	t.timer = time.AfterFunc(t.options.FlushInterval, t.flushWindow)
}

func (t *UsageTelemetry) flushWindow() {
	// One send at a time, so Flush also waits for a send that the timer started.
	t.sending.Lock()
	defer t.sending.Unlock()
	t.mu.Lock()
	if len(t.counts) == 0 {
		t.mu.Unlock()
		return
	}
	t.timer.Stop()
	sentCounts := t.counts
	sentStart := t.windowStart
	t.counts = map[string]*usageTelemetryCounts{}
	t.mu.Unlock()

	if usageTelemetryDisabled() {
		return
	}
	events := t.toEvents(sentCounts, sentStart, time.Since(sentStart))
	err := t.send(events)
	if err == nil || !usageTelemetryKeepAfter(err) {
		return
	}
	t.mu.Lock()
	defer t.mu.Unlock()
	if len(t.counts) == 0 {
		t.openWindow()
	}
	if sentStart.Before(t.windowStart) {
		t.windowStart = sentStart
	}
	for operationID, sent := range sentCounts {
		operation := t.counts[operationID]
		if operation == nil {
			t.counts[operationID] = sent
			continue
		}
		operation.calls += sent.calls
		operation.attempts += sent.attempts
		operation.durationSumMs += sent.durationSumMs
		for key, count := range sent.status {
			operation.status[key] += count
		}
		for key, count := range sent.latency {
			operation.latency[key] += count
		}
	}
}

func usageTelemetryStatusClass(call SettledCall) string {
	if call.Response == nil {
		var timeout *TimeoutError
		// The caller's own deadline is a timeout too, as a caller's AbortSignal.timeout() is in TypeScript.
		if errors.As(call.Err, &timeout) || errors.Is(call.Err, context.DeadlineExceeded) {
			return "timeout"
		}
		if errors.Is(call.Err, context.Canceled) {
			return "aborted"
		}
		return "network_error"
	}
	status := call.Response.StatusCode
	switch {
	case status >= 500:
		return "5xx"
	case status >= 400:
		return "4xx"
	case status >= 300:
		return "3xx"
	}
	return "2xx"
}

func (t *UsageTelemetry) toEvents(counts map[string]*usageTelemetryCounts, windowStart time.Time, window time.Duration) []UsageTelemetryEvent {
	events := []UsageTelemetryEvent{}
	for operationID, operation := range counts {
		operationItem := map[string]any{
			"id":              operationID,
			"object":          "operation",
			"uri":             usageTelemetrySDKURNPrefix + t.options.SDKName + ":operation:" + operationID,
			"window_ms":       window.Milliseconds(),
			"calls":           operation.calls,
			"attempts":        operation.attempts,
			"duration_sum_ms": operation.durationSumMs,
		}
		for key, count := range operation.status {
			operationItem["status_"+key] = count
		}
		for key, count := range operation.latency {
			operationItem["latency_"+key] = count
		}
		events = append(events, UsageTelemetryEvent{
			ID:              usageTelemetryEventID(),
			Object:          "event",
			SpecVersion:     "1.0",
			DataContentType: "application/json; charset=utf-8",
			Type:            usageTelemetryEventType,
			Source:          "urn:redocly:cli",
			Time:            windowStart.UTC().Format("2006-01-02T15:04:05.000Z"),
			Origin:          "redocly-sdk",
			Category:        "product",
			Signal:          "metric",
			Data:            []map[string]any{operationItem, t.sdk},
		})
	}
	return events
}

// usageTelemetryEventID returns evt_ and a lowercase ULID: 10 characters of the time
// in milliseconds, then 16 random characters.
func usageTelemetryEventID() string {
	id := make([]byte, 26)
	millis := time.Now().UnixMilli()
	for index := 9; index >= 0; index-- {
		id[index] = usageTelemetryCrockfordBase32[millis%32]
		millis /= 32
	}
	random := make([]byte, 16)
	rand.Read(random)
	for index, value := range random {
		id[10+index] = usageTelemetryCrockfordBase32[value%32]
	}
	return "evt_" + string(id)
}

type usageTelemetryRejectedError struct {
	status int
}

func (e *usageTelemetryRejectedError) Error() string {
	return fmt.Sprintf("the telemetry endpoint answered %d", e.status)
}

func (t *UsageTelemetry) send(events []UsageTelemetryEvent) error {
	if t.options.Sink != nil {
		return t.options.Sink(events)
	}
	body, err := json.Marshal(usageTelemetryOtlpRequest(events))
	if err != nil {
		return err
	}
	ctx, cancel := context.WithTimeout(context.Background(), usageTelemetrySendTimeout)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, t.options.Endpoint, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	// One send per window, so the connection is never reused.
	req.Close = true
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode > 299 {
		return &usageTelemetryRejectedError{status: resp.StatusCode}
	}
	return nil
}

func usageTelemetryKeepAfter(err error) bool {
	// The endpoint can have stored the counts of a send that timed out.
	if errors.Is(err, context.DeadlineExceeded) {
		return false
	}
	var rejected *usageTelemetryRejectedError
	if errors.As(err, &rejected) {
		return rejected.status == 408 || rejected.status == 429 || rejected.status >= 500
	}
	return true
}

func usageTelemetryOtlpRequest(events []UsageTelemetryEvent) map[string]any {
	spans := []map[string]any{}
	for _, event := range events {
		eventTime, _ := time.Parse(time.RFC3339, event.Time)
		timeUnixNano := strconv.FormatInt(eventTime.UnixMilli(), 10) + "000000"
		// The attributes that processCloudEventAttributes of @redocly/cli-otel gives for the event.
		attributes := []map[string]any{
			usageTelemetryAttribute("cloudevents.event_id", event.ID),
			usageTelemetryAttribute("cloudevents.event_type", event.Type),
			usageTelemetryAttribute("cloudevents.event_source", event.Source),
			usageTelemetryAttribute("cloudevents.event_spec_version", event.SpecVersion),
			usageTelemetryAttribute("cloudevents.event_data_content_type", event.DataContentType),
			usageTelemetryAttribute("cloudevents.event_time", event.Time),
			usageTelemetryAttribute("cloudevents.event_subject", event.Data[0]["id"]),
			usageTelemetryAttribute("cloudevents.event_origin", event.Origin),
			usageTelemetryAttribute("cloudevents.event_object", event.Object),
			usageTelemetryAttribute("cloudevents.event_category", event.Category),
			usageTelemetryAttribute("cloudevents.event_signal", event.Signal),
			usageTelemetryAttribute("cloudevents.event_request_id", ""),
		}
		for _, item := range event.Data {
			for key, value := range item {
				attributes = append(attributes, usageTelemetryAttribute(fmt.Sprintf("cloudevents.event_data.%s.%s", item["object"], key), value))
			}
		}
		for _, item := range event.Data {
			for _, key := range []string{"id", "object", "uri"} {
				attributes = append(attributes, usageTelemetryAttribute(fmt.Sprintf("cloudevents.event_subjects.%s.%s", item["object"], key), item[key]))
			}
		}
		spans = append(spans, map[string]any{
			"traceId":           usageTelemetryRandomHex(16),
			"spanId":            usageTelemetryRandomHex(8),
			"name":              "event." + event.Type,
			"kind":              1,
			"startTimeUnixNano": timeUnixNano,
			"endTimeUnixNano":   timeUnixNano,
			"attributes":        attributes,
		})
	}
	return map[string]any{
		"resourceSpans": []map[string]any{
			{
				"resource": map[string]any{
					"attributes": []map[string]any{
						usageTelemetryAttribute("service.name", usageTelemetryServiceName),
						usageTelemetryAttribute("service.version", usageTelemetryGeneratorVersion),
					},
				},
				"scopeSpans": []map[string]any{
					{"scope": map[string]any{"name": "redocly-sdk-telemetry"}, "spans": spans},
				},
			},
		},
	}
}

func usageTelemetryAttribute(key string, value any) map[string]any {
	switch typed := value.(type) {
	case int64:
		return map[string]any{"key": key, "value": map[string]any{"intValue": typed}}
	case string:
		return map[string]any{"key": key, "value": map[string]any{"stringValue": typed}}
	}
	return map[string]any{"key": key, "value": map[string]any{"stringValue": fmt.Sprint(value)}}
}

func usageTelemetryRandomHex(byteCount int) string {
	buffer := make([]byte, byteCount)
	rand.Read(buffer)
	return hex.EncodeToString(buffer)
}
