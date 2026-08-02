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
