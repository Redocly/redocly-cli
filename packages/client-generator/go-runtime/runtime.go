// Package client — the embedded runtime for generated Go SDKs. Hand-authored
// once and stitched into every generated client (see
// scripts/generate-runtime-sources.mjs), semantically in lockstep with the
// TypeScript runtime: auth OR-alternatives, a retry loop with Retry-After and
// full-jitter backoff, per-attempt timeouts, idempotency keys, and middleware
// hooks. Standard library only — a generated Go SDK has zero dependencies.
package client

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math/rand"
	"mime/multipart"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

// APIError is returned for a non-2xx response, carrying the decoded error body.
type APIError struct {
	URL        string
	Status     int
	StatusText string
	Body       any
}

func (e *APIError) Error() string {
	return fmt.Sprintf("request failed with status %d", e.Status)
}

// TimeoutError is returned when a request attempt exceeds the configured
// timeout — carrying the context a log line needs.
type TimeoutError struct {
	OperationID string
	Timeout     time.Duration
	Attempt     int
}

func (e *TimeoutError) Error() string {
	return fmt.Sprintf("request %q timed out after %s (attempt %d)", e.OperationID, e.Timeout, e.Attempt)
}

// SecuritySpec mirrors the descriptor table's security entries.
type SecuritySpec struct {
	Scheme string
	Kind   string // "bearer" | "basic" | "apiKey"
	Name   string // header/query/cookie name for apiKey
	In     string // "header" | "query" | "cookie"
}

// Auth holds the client credentials; zero value = anonymous.
type Auth struct {
	Bearer func() string
	Basic  *BasicAuth
	APIKey map[string]func() string
}

type BasicAuth struct {
	Username string
	Password string
}

// RetryConfig mirrors the TypeScript runtime's retry policy knobs.
type RetryConfig struct {
	Retries       int
	RetryDelay    time.Duration // base; default 1s
	RetryStrategy string        // "" (exponential) | "fixed"
	NoJitter      bool
	// RetryOn fully replaces the default predicate when set.
	RetryOn func(attempt int, resp *http.Response, err error) bool
}

// Middleware hooks run around every request (OnRequest before serialization order
// is N/A in Go — bodies are values; OnResponse runs in reverse registration order).
type Middleware struct {
	OnRequest  func(req *http.Request)
	OnResponse func(resp *http.Response)
}

// Date is an RFC 3339 full-date — a calendar date with no time component. Fields
// typed `date` under `dateType: Date` use it because encoding/json speaks only
// RFC 3339 date-time for time.Time, which a bare "2006-01-02" fails to satisfy.
type Date struct {
	time.Time
}

const dateLayout = "2006-01-02"

// UnmarshalJSON parses a "2006-01-02" string; an empty string leaves the zero value.
func (d *Date) UnmarshalJSON(data []byte) error {
	var raw string
	if err := json.Unmarshal(data, &raw); err != nil {
		return err
	}
	if raw == "" {
		return nil
	}
	parsed, err := time.Parse(dateLayout, raw)
	if err != nil {
		return err
	}
	d.Time = parsed
	return nil
}

// MarshalJSON writes the date back without a time component.
func (d Date) MarshalJSON() ([]byte, error) {
	return json.Marshal(d.Format(dateLayout))
}

// Config is the per-client configuration shared by every operation method.
type Config struct {
	ServerURL      string
	HTTPClient     *http.Client
	Headers        map[string]string
	Timeout        time.Duration
	Retry          RetryConfig
	Middleware     []Middleware
	IdempotencyKey func() string
	Auth           Auth
}

func resolveToken(provider func() string) string {
	if provider == nil {
		return ""
	}
	return provider()
}

func schemeConfigured(spec SecuritySpec, auth Auth) bool {
	switch spec.Kind {
	case "apiKey":
		_, ok := auth.APIKey[spec.Scheme]
		return ok
	case "bearer":
		return auth.Bearer != nil
	default:
		return auth.Basic != nil
	}
}

// resolveAuth applies the first fully-configured OR-alternative; when none is,
// the first alternative's configured schemes are still sent (the server rejects
// the request — same behavior as the TypeScript runtime).
func resolveAuth(security [][]SecuritySpec, auth Auth) (map[string]string, url.Values) {
	headers := map[string]string{}
	query := url.Values{}
	if len(security) == 0 {
		return headers, query
	}
	alternative := security[0]
	for _, candidate := range security {
		all := true
		for _, spec := range candidate {
			if !schemeConfigured(spec, auth) {
				all = false
				break
			}
		}
		if all {
			alternative = candidate
			break
		}
	}
	var cookies []string
	for _, spec := range alternative {
		switch spec.Kind {
		case "apiKey":
			provider, ok := auth.APIKey[spec.Scheme]
			if !ok {
				continue
			}
			value := resolveToken(provider)
			switch spec.In {
			case "query":
				query.Set(spec.Name, value)
			case "cookie":
				cookies = append(cookies, spec.Name+"="+url.QueryEscape(value))
			default:
				headers[spec.Name] = value
			}
		case "bearer":
			if auth.Bearer != nil {
				headers["Authorization"] = "Bearer " + resolveToken(auth.Bearer)
			}
		default:
			if auth.Basic != nil {
				token := base64.StdEncoding.EncodeToString([]byte(auth.Basic.Username + ":" + auth.Basic.Password))
				headers["Authorization"] = "Basic " + token
			}
		}
	}
	if len(cookies) > 0 {
		headers["Cookie"] = strings.Join(cookies, "; ")
	}
	return headers, query
}

// buildURL substitutes {param} path placeholders with percent-encoded values.
func buildURL(serverURL, path string, pathParams map[string]string) string {
	filled := path
	for name, value := range pathParams {
		filled = strings.ReplaceAll(filled, "{"+name+"}", url.PathEscape(value))
	}
	return strings.TrimRight(serverURL, "/") + filled
}

var transientStatus = map[int]bool{408: true, 429: true, 500: true, 502: true, 503: true, 504: true}

func defaultRetryOn(method string, headers map[string]string, resp *http.Response, err error) bool {
	safe := false
	switch strings.ToUpper(method) {
	case "GET", "HEAD", "PUT", "DELETE", "OPTIONS":
		safe = true
	}
	if _, ok := headers["Idempotency-Key"]; ok {
		safe = true
	}
	if !safe {
		return false
	}
	if err != nil {
		return true
	}
	return resp != nil && transientStatus[resp.StatusCode]
}

func retryDelay(retry RetryConfig, attempt int, retryAfter string) time.Duration {
	if retryAfter != "" {
		if seconds, err := strconv.ParseFloat(retryAfter, 64); err == nil {
			return time.Duration(seconds * float64(time.Second))
		}
	}
	base := retry.RetryDelay
	if base == 0 {
		base = time.Second
	}
	raw := base
	if retry.RetryStrategy != "fixed" {
		raw = base * time.Duration(1<<(attempt-1))
	}
	if retry.NoJitter {
		return raw
	}
	return time.Duration(rand.Int63n(int64(raw) + 1))
}

type requestSpec struct {
	OperationID    string
	Method         string
	URL            string
	Headers        map[string]string
	Query          url.Values
	Body           io.Reader
	ContentType    string
	Timeout        time.Duration
	Retry          *RetryConfig
	IdempotencyKey string
	// bodyBytes is retained so retries can replay the body.
	bodyBytes []byte
}

// send is the request core: header merge, idempotency keys, the retry loop
// (fresh timeout budget per attempt), and the middleware onion.
func send(ctx context.Context, config *Config, spec requestSpec) (*http.Response, error) {
	retry := config.Retry
	if spec.Retry != nil {
		retry = *spec.Retry
	}
	timeout := config.Timeout
	if spec.Timeout != 0 {
		timeout = spec.Timeout
	}
	headers := map[string]string{}
	for key, value := range config.Headers {
		headers[key] = value
	}
	for key, value := range spec.Headers {
		headers[key] = value
	}
	method := strings.ToUpper(spec.Method)
	if (method == "POST" || method == "PATCH") && headers["Idempotency-Key"] == "" {
		if spec.IdempotencyKey != "" {
			headers["Idempotency-Key"] = spec.IdempotencyKey
		} else if config.IdempotencyKey != nil {
			headers["Idempotency-Key"] = config.IdempotencyKey()
		}
	}
	httpClient := config.HTTPClient
	if httpClient == nil {
		httpClient = http.DefaultClient
	}
	if spec.Body != nil {
		payload, err := io.ReadAll(spec.Body)
		if err != nil {
			return nil, err
		}
		spec.bodyBytes = payload
	}
	fullURL := spec.URL
	if len(spec.Query) > 0 {
		separator := "?"
		if strings.Contains(fullURL, "?") {
			separator = "&"
		}
		fullURL += separator + spec.Query.Encode()
	}
	maxAttempts := 1 + retry.Retries
	for attempt := 1; ; attempt++ {
		attemptCtx := ctx
		var cancel context.CancelFunc
		if timeout > 0 {
			attemptCtx, cancel = context.WithTimeout(ctx, timeout)
		}
		var bodyReader io.Reader
		if spec.bodyBytes != nil {
			bodyReader = bytes.NewReader(spec.bodyBytes)
		}
		req, err := http.NewRequestWithContext(attemptCtx, method, fullURL, bodyReader)
		if err != nil {
			if cancel != nil {
				cancel()
			}
			return nil, err
		}
		for key, value := range headers {
			req.Header.Set(key, value)
		}
		if spec.ContentType != "" && spec.bodyBytes != nil {
			req.Header.Set("Content-Type", spec.ContentType)
		}
		for _, mw := range config.Middleware {
			if mw.OnRequest != nil {
				mw.OnRequest(req)
			}
		}
		resp, err := httpClient.Do(req)
		shouldRetry := retry.RetryOn
		retryable := false
		if shouldRetry != nil {
			retryable = shouldRetry(attempt, resp, err)
		} else {
			retryable = defaultRetryOn(method, headers, resp, err)
		}
		if err != nil {
			if cancel != nil {
				cancel()
			}
			timedOut := errors.Is(err, context.DeadlineExceeded) && ctx.Err() == nil
			if attempt < maxAttempts && retryable {
				time.Sleep(retryDelay(retry, attempt, ""))
				continue
			}
			if timedOut {
				return nil, &TimeoutError{OperationID: spec.OperationID, Timeout: timeout, Attempt: attempt}
			}
			return nil, err
		}
		for i := len(config.Middleware) - 1; i >= 0; i-- {
			if config.Middleware[i].OnResponse != nil {
				config.Middleware[i].OnResponse(resp)
			}
		}
		if resp.StatusCode >= 400 && attempt < maxAttempts && retryable {
			after := resp.Header.Get("Retry-After")
			io.Copy(io.Discard, resp.Body)
			resp.Body.Close()
			if cancel != nil {
				cancel()
			}
			time.Sleep(retryDelay(retry, attempt, after))
			continue
		}
		// The response body outlives this call; tie the attempt context's lifetime to it.
		if cancel != nil {
			resp.Body = &cancelOnClose{ReadCloser: resp.Body, cancel: cancel}
		}
		return resp, nil
	}
}

type cancelOnClose struct {
	io.ReadCloser
	cancel context.CancelFunc
}

func (c *cancelOnClose) Close() error {
	c.cancel()
	return c.ReadCloser.Close()
}

// decodeJSON decodes a response body into target; a nil target drains and closes.
func decodeJSON(resp *http.Response, target any) error {
	defer resp.Body.Close()
	if target == nil {
		_, err := io.Copy(io.Discard, resp.Body)
		return err
	}
	return json.NewDecoder(resp.Body).Decode(target)
}

// headerString returns the named response header, or nil when absent.
func headerString(header http.Header, name string) *string {
	value := header.Get(name)
	if value == "" {
		return nil
	}
	return &value
}

// headerInt64 parses the named header as an integer; nil when absent or unparsable.
func headerInt64(header http.Header, name string) *int64 {
	raw := strings.TrimSpace(header.Get(name))
	if raw == "" {
		return nil
	}
	value, err := strconv.ParseInt(raw, 10, 64)
	if err != nil {
		return nil
	}
	return &value
}

// headerFloat64 parses the named header as a number; nil when absent or unparsable.
func headerFloat64(header http.Header, name string) *float64 {
	raw := strings.TrimSpace(header.Get(name))
	if raw == "" {
		return nil
	}
	value, err := strconv.ParseFloat(raw, 64)
	if err != nil {
		return nil
	}
	return &value
}

// headerBool parses a `true`/`false` header; nil when absent or anything else.
func headerBool(header http.Header, name string) *bool {
	raw := strings.ToLower(strings.TrimSpace(header.Get(name)))
	if raw != "true" && raw != "false" {
		return nil
	}
	value := raw == "true"
	return &value
}

// apiErrorFrom builds the structured error for a non-2xx response.
func apiErrorFrom(resp *http.Response, requestURL string) error {
	defer resp.Body.Close()
	var body any
	data, _ := io.ReadAll(resp.Body)
	if len(data) > 0 {
		if err := json.Unmarshal(data, &body); err != nil {
			body = string(data)
		}
	}
	return &APIError{URL: requestURL, Status: resp.StatusCode, StatusText: resp.Status, Body: body}
}

// ─── Pagination ───

// PaginationSpec mirrors the descriptor table's pagination entries.
type PaginationSpec struct {
	Style      string
	Param      string
	NextCursor string
	HasMore    string
	LimitParam string
	Items      string
}

// resolvePointer walks an RFC 6901 JSON pointer over decoded JSON; nil on any miss.
func resolvePointer(data any, pointer string) any {
	if pointer == "" {
		return data
	}
	if !strings.HasPrefix(pointer, "/") {
		return nil
	}
	current := data
	for _, token := range strings.Split(pointer[1:], "/") {
		key := strings.ReplaceAll(strings.ReplaceAll(token, "~1", "/"), "~0", "~")
		switch typed := current.(type) {
		case map[string]any:
			current = typed[key]
		case []any:
			index, err := strconv.Atoi(key)
			if err != nil || index < 0 || index >= len(typed) {
				return nil
			}
			current = typed[index]
		default:
			return nil
		}
		if current == nil {
			return nil
		}
	}
	return current
}

// reencode converts decoded JSON (maps/slices) into a typed value via a JSON round-trip.
func reencode(raw any, target any) error {
	data, err := json.Marshal(raw)
	if err != nil {
		return err
	}
	return json.Unmarshal(data, target)
}

type pageCall func(params url.Values) (any, *http.Response, error)

// iterPages yields raw page JSON per the pagination spec — the same stop
// conditions and infinite-loop guards as the TypeScript runtime. The returned
// function is a range-over-func iterator (Go 1.23+) and plainly callable before that.
func iterPages(call pageCall, spec PaginationSpec, base url.Values) func(yield func(any, error) bool) {
	return func(yield func(any, error) bool) {
		switch spec.Style {
		case "cursor":
			var cursor any
			if values, ok := base[spec.Param]; ok && len(values) > 0 {
				cursor = values[0]
			}
			for {
				params := cloneValues(base)
				if cursor != nil {
					params.Set(spec.Param, fmt.Sprint(cursor))
				}
				page, _, err := call(params)
				if err != nil {
					yield(nil, err)
					return
				}
				if !yield(page, nil) {
					return
				}
				if spec.HasMore != "" {
					if more, ok := resolvePointer(page, spec.HasMore).(bool); ok && !more {
						return
					}
				}
				next := resolvePointer(page, spec.NextCursor)
				if next == nil || next == "" {
					return
				}
				switch next.(type) {
				case string, float64:
				default:
					yield(nil, fmt.Errorf("pagination cursor at %s is not a string or number", spec.NextCursor))
					return
				}
				if cursor != nil && fmt.Sprint(next) == fmt.Sprint(cursor) {
					yield(nil, errors.New("pagination did not advance: the operation returned the same cursor twice"))
					return
				}
				cursor = next
			}
		case "link":
			params := cloneValues(base)
			previous := ""
			for {
				page, resp, err := call(params)
				if err != nil {
					yield(nil, err)
					return
				}
				if !yield(page, nil) {
					return
				}
				target := linkNext(resp.Header.Get("Link"))
				if target == "" {
					return
				}
				pageURL := ""
				if resp.Request != nil && resp.Request.URL != nil {
					pageURL = resp.Request.URL.String()
				}
				baseURL, err := url.Parse(pageURL)
				if err != nil || pageURL == "" {
					baseURL, _ = url.Parse("http://relative.invalid")
				}
				targetURL, err := baseURL.Parse(target)
				if err != nil {
					yield(nil, err)
					return
				}
				next := targetURL.String()
				if next == previous || next == pageURL {
					yield(nil, errors.New(`pagination did not advance: the Link rel="next" target repeats`))
					return
				}
				previous = next
				params = cloneValues(base)
				for key, values := range targetURL.Query() {
					for _, value := range values {
						params.Add(key, value)
					}
				}
			}
		default: // offset / page
			position := 0
			if spec.Style == "page" {
				position = 1
			}
			if values, ok := base[spec.Param]; ok && len(values) > 0 && values[0] != "" {
				if parsed, err := strconv.Atoi(values[0]); err == nil {
					position = parsed
				}
			}
			previousItems := ""
			for {
				params := cloneValues(base)
				params.Set(spec.Param, strconv.Itoa(position))
				page, _, err := call(params)
				if err != nil {
					yield(nil, err)
					return
				}
				items, _ := resolvePointer(page, spec.Items).([]any)
				serialized := ""
				if items != nil {
					serialized = fmt.Sprint(items)
					if serialized == previousItems {
						yield(nil, errors.New("pagination did not advance: the operation returned the same page twice"))
						return
					}
				}
				if !yield(page, nil) {
					return
				}
				if len(items) == 0 {
					return
				}
				previousItems = serialized
				if spec.Style == "page" {
					position++
				} else {
					position += len(items)
				}
			}
		}
	}
}

func cloneValues(values url.Values) url.Values {
	out := url.Values{}
	for key, entries := range values {
		for _, entry := range entries {
			out.Add(key, entry)
		}
	}
	return out
}

func linkNext(header string) string {
	if header == "" {
		return ""
	}
	for _, entry := range strings.Split(header, ",") {
		parts := strings.Split(entry, ";")
		if len(parts) < 2 {
			continue
		}
		target := strings.TrimSpace(parts[0])
		if !strings.HasPrefix(target, "<") || !strings.HasSuffix(target, ">") {
			continue
		}
		for _, param := range parts[1:] {
			trimmed := strings.TrimSpace(param)
			if strings.HasPrefix(trimmed, "rel=") {
				rel := strings.Trim(strings.TrimPrefix(trimmed, "rel="), `"`)
				for _, kind := range strings.Fields(rel) {
					if kind == "next" {
						return strings.Trim(target, "<>")
					}
				}
			}
		}
	}
	return ""
}

// ─── Server-Sent Events ───

// ServerSentEvent is one decoded event; Data is the raw text (or parsed JSON
// for operations that declare a JSON event stream).
type ServerSentEvent struct {
	Event string
	Data  any
	ID    string
	Retry int
}

func parseSSEFrame(raw string, jsonData bool) (ServerSentEvent, bool, error) {
	event := ServerSentEvent{Retry: -1}
	sawField := false
	var dataLines []string
	normalized := strings.ReplaceAll(strings.ReplaceAll(raw, "\r\n", "\n"), "\r", "\n")
	for _, line := range strings.Split(normalized, "\n") {
		if line == "" || strings.HasPrefix(line, ":") {
			continue
		}
		field, value, _ := strings.Cut(line, ":")
		value = strings.TrimPrefix(value, " ")
		sawField = true
		switch field {
		case "event":
			event.Event = value
		case "data":
			dataLines = append(dataLines, value)
		case "id":
			event.ID = value
		case "retry":
			if parsed, err := strconv.Atoi(value); err == nil && parsed >= 0 && value != "" {
				event.Retry = parsed
			}
		}
	}
	if !sawField {
		return event, false, nil
	}
	text := strings.Join(dataLines, "\n")
	event.Data = text
	if jsonData && text != "" {
		var parsed any
		if err := json.Unmarshal([]byte(text), &parsed); err != nil {
			return event, false, err
		}
		event.Data = parsed
	}
	return event, true, nil
}

// iterSSE streams events, reconnecting on dropped connections with Last-Event-ID
// (a fresh open call = fresh auth); a 4xx/5xx or a bad JSON payload is definitive.
func iterSSE(open func(extraHeaders map[string]string) (*http.Response, error), jsonData bool) func(yield func(ServerSentEvent, error) bool) {
	return func(yield func(ServerSentEvent, error) bool) {
		lastEventID := ""
		serverRetry := -1
		failures := 0
		for {
			headers := map[string]string{"Accept": "text/event-stream"}
			if lastEventID != "" {
				headers["Last-Event-ID"] = lastEventID
			}
			resp, err := open(headers)
			if err == nil && resp.StatusCode >= 400 {
				yield(ServerSentEvent{}, apiErrorFrom(resp, ""))
				return
			}
			if err == nil {
				failures = 0
				buffer := ""
				chunk := make([]byte, 4096)
				clean := false
				for {
					n, readErr := resp.Body.Read(chunk)
					buffer += string(chunk[:n])
					for {
						frame, rest, found := strings.Cut(buffer, "\n\n")
						if !found {
							break
						}
						buffer = rest
						event, ok, parseErr := parseSSEFrame(frame, jsonData)
						if parseErr != nil {
							resp.Body.Close()
							yield(ServerSentEvent{}, parseErr)
							return
						}
						if ok {
							if event.ID != "" {
								lastEventID = event.ID
							}
							if event.Retry >= 0 {
								serverRetry = event.Retry
							}
							if !yield(event, nil) {
								resp.Body.Close()
								return
							}
						}
					}
					if readErr == io.EOF {
						clean = true
						break
					}
					if readErr != nil {
						break
					}
				}
				resp.Body.Close()
				if clean {
					if strings.TrimSpace(buffer) != "" {
						if event, ok, parseErr := parseSSEFrame(buffer, jsonData); parseErr == nil && ok {
							yield(event, nil)
						}
					}
					return
				}
			}
			failures++
			base := time.Second
			if serverRetry >= 0 {
				base = time.Duration(serverRetry) * time.Millisecond
			}
			delay := base * time.Duration(1<<(failures-1))
			if delay > 30*time.Second {
				delay = 30 * time.Second
			}
			time.Sleep(time.Duration(rand.Int63n(int64(delay) + 1)))
		}
	}
}

// ─── Multipart ───

// toMultipart splits a typed body into a multipart/form-data payload: []byte
// values upload as file parts, everything else as form fields (nested values
// JSON-encoded) — mirroring the TypeScript runtime's FormData serialization.
func toMultipart(body any) (string, io.Reader, error) {
	var wire map[string]any
	if err := reencode(body, &wire); err != nil {
		return "", nil, err
	}
	buffer := &bytes.Buffer{}
	writer := multipart.NewWriter(buffer)
	for key, value := range wire {
		switch typed := value.(type) {
		case string:
			if err := writer.WriteField(key, typed); err != nil {
				return "", nil, err
			}
		case float64, bool:
			if err := writer.WriteField(key, fmt.Sprint(typed)); err != nil {
				return "", nil, err
			}
		default:
			encoded, err := json.Marshal(typed)
			if err != nil {
				return "", nil, err
			}
			if err := writer.WriteField(key, string(encoded)); err != nil {
				return "", nil, err
			}
		}
	}
	if err := writer.Close(); err != nil {
		return "", nil, err
	}
	return writer.FormDataContentType(), buffer, nil
}
