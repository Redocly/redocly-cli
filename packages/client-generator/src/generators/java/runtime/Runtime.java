// @redocly/client-generator Java runtime — embedded into generated clients.
// Java >= 17, zero dependencies; HTTP over java.net.http.HttpClient, JSON over the
// small reader/writer below. Hand-authored once and stitched into every generated
// client (see scripts/generate-runtime-sources.mjs): the generated class inlines this
// class body, or extends this class under `--runtime module`, so every name below is
// reachable unqualified either way. Semantically in lockstep with the TypeScript
// runtime: auth OR-alternatives, a retry loop with Retry-After and full-jitter backoff,
// per-attempt timeouts, idempotency keys, middleware hooks, pagination, and SSE.

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Collections;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Objects;
import java.util.concurrent.ThreadLocalRandom;
import java.util.function.Function;
import java.util.function.Supplier;

abstract class Runtime {
    // ─── Errors ───

    /** A response with status >= 400, with the decoded body attached. */
    public static class ApiException extends RuntimeException {
        private static final long serialVersionUID = 1L;
        public final String url;
        public final int status;
        public final transient Object body;

        public ApiException(String url, int status, Object body) {
            super("Request failed with status " + status + " for " + url);
            this.url = url;
            this.status = status;
            this.body = body;
        }
    }

    /** A request attempt exceeded the configured timeout. */
    public static class ApiTimeoutException extends RuntimeException {
        private static final long serialVersionUID = 1L;
        public final String operationId;
        public final Duration timeout;
        public final int attempt;

        public ApiTimeoutException(String operationId, Duration timeout, int attempt) {
            super("Request \"" + operationId + "\" timed out after " + timeout + " (attempt " + attempt + ")");
            this.operationId = operationId;
            this.timeout = timeout;
            this.attempt = attempt;
        }
    }

    // ─── Configuration ───

    public record BasicAuth(String username, String password) {}

    /** The client credentials; an empty Auth is anonymous. Providers are called per request. */
    public static final class Auth {
        Supplier<String> bearer;
        BasicAuth basic;
        final Map<String, Supplier<String>> apiKey = new LinkedHashMap<>();

        public Auth bearer(String token) {
            return bearer(() -> token);
        }

        public Auth bearer(Supplier<String> provider) {
            this.bearer = provider;
            return this;
        }

        public Auth basic(String username, String password) {
            this.basic = new BasicAuth(username, password);
            return this;
        }

        public Auth apiKey(String scheme, String value) {
            return apiKey(scheme, () -> value);
        }

        public Auth apiKey(String scheme, Supplier<String> provider) {
            this.apiKey.put(scheme, provider);
            return this;
        }
    }

    /** Decides whether an attempt is retried: the response, or the error when there is none. */
    @FunctionalInterface
    public interface RetryOn {
        boolean test(int attempt, HttpResponse<?> response, Exception error);
    }

    /** The retry policy: `retries` extra attempts, with fixed or exponential (default) backoff. */
    public static final class Retry {
        int retries;
        Duration delay = Duration.ofSeconds(1);
        String strategy = "exponential";
        boolean noJitter;
        RetryOn retryOn;

        public Retry retries(int retries) {
            this.retries = retries;
            return this;
        }

        public Retry delay(Duration delay) {
            this.delay = delay;
            return this;
        }

        /** `"exponential"` (default) or `"fixed"`. */
        public Retry strategy(String strategy) {
            this.strategy = strategy;
            return this;
        }

        public Retry noJitter(boolean noJitter) {
            this.noJitter = noJitter;
            return this;
        }

        /** Replaces the default predicate (idempotent methods on 408/429/5xx or a transport error). */
        public Retry retryOn(RetryOn retryOn) {
            this.retryOn = retryOn;
            return this;
        }
    }

    /** Hooks around every attempt: `onRequest` before it is sent, `onResponse` in reverse order. */
    public interface Middleware {
        default void onRequest(HttpRequest.Builder request) {}

        default void onResponse(HttpResponse<InputStream> response) {}
    }

    /** Per-client configuration shared by every operation method. */
    public static final class Config {
        String serverUrl = "";
        HttpClient httpClient;
        final Map<String, String> headers = new LinkedHashMap<>();
        Duration timeout;
        Retry retry = new Retry();
        final List<Middleware> middleware = new ArrayList<>();
        Supplier<String> idempotencyKey;
        Auth auth = new Auth();
        String clientHeader = "redocly-client-generator";

        public Config serverUrl(String serverUrl) {
            this.serverUrl = serverUrl;
            return this;
        }

        public Config httpClient(HttpClient httpClient) {
            this.httpClient = httpClient;
            return this;
        }

        /** A header sent with every request; a `Content-Type` here wins over the description's. */
        public Config header(String name, String value) {
            this.headers.put(name, value);
            return this;
        }

        /** The budget of one attempt; a later attempt gets a fresh one. */
        public Config timeout(Duration timeout) {
            this.timeout = timeout;
            return this;
        }

        public Config retry(Retry retry) {
            this.retry = retry;
            return this;
        }

        public Config middleware(Middleware middleware) {
            this.middleware.add(middleware);
            return this;
        }

        /** Supplies the `Idempotency-Key` of every POST and PATCH that does not carry one. */
        public Config idempotencyKey(Supplier<String> idempotencyKey) {
            this.idempotencyKey = idempotencyKey;
            return this;
        }

        public Config auth(Auth auth) {
            this.auth = auth;
            return this;
        }
    }

    /** A `<op>WithHeaders` result: the decoded body plus the coerced declared headers. */
    public record Envelope<T>(T data, Map<String, Object> headers, int status) {}

    /** One decoded `text/event-stream` frame; `data` is parsed JSON for JSON event streams. */
    public record ServerSentEvent(String event, Object data, String id, Integer retry) {}

    /** One entry of the operations table's security requirements. */
    public record SecuritySpec(String scheme, String kind, String name, String in) {
        static SecuritySpec of(String scheme, String kind) {
            return new SecuritySpec(scheme, kind, null, null);
        }
    }

    /** One entry of the operations table's pagination rules. */
    public record PaginationSpec(
        String style,
        String param,
        String nextCursor,
        String hasMore,
        String nextLink,
        String limitParam,
        String items
    ) {}

    record Operation(
        String id,
        String method,
        String path,
        List<List<SecuritySpec>> security,
        PaginationSpec pagination
    ) {}

    // ─── JSON ───

    /**
     * A minimal JSON reader and writer over plain values: `Map<String, Object>` (insertion
     * ordered), `List<Object>`, `String`, `Long` for integral numbers, `Double` for the rest,
     * `Boolean`, and `null`. No streaming: a response body is read whole, then parsed.
     */
    public static final class Json {
        private final String text;
        private int position;

        private Json(String text) {
            this.text = text;
        }

        public static Object parse(String text) {
            Json json = new Json(text);
            json.skipWhitespace();
            Object value = json.readValue();
            json.skipWhitespace();
            if (json.position != text.length()) {
                throw json.error("unexpected trailing characters");
            }
            return value;
        }

        public static String write(Object value) {
            StringBuilder out = new StringBuilder();
            writeValue(out, value);
            return out.toString();
        }

        private IllegalArgumentException error(String message) {
            return new IllegalArgumentException("Invalid JSON at offset " + position + ": " + message);
        }

        private void skipWhitespace() {
            while (position < text.length()) {
                char current = text.charAt(position);
                if (current != ' ' && current != '\n' && current != '\r' && current != '\t') {
                    break;
                }
                position++;
            }
        }

        private Object readValue() {
            if (position >= text.length()) {
                throw error("unexpected end of input");
            }
            char current = text.charAt(position);
            switch (current) {
                case '{':
                    return readObject();
                case '[':
                    return readArray();
                case '"':
                    return readString();
                case 't':
                    expectWord("true");
                    return Boolean.TRUE;
                case 'f':
                    expectWord("false");
                    return Boolean.FALSE;
                case 'n':
                    expectWord("null");
                    return null;
                default:
                    if (current == '-' || (current >= '0' && current <= '9')) {
                        return readNumber();
                    }
                    throw error("unexpected character '" + current + "'");
            }
        }

        private void expectWord(String word) {
            if (!text.startsWith(word, position)) {
                throw error("expected " + word);
            }
            position += word.length();
        }

        private Map<String, Object> readObject() {
            Map<String, Object> object = new LinkedHashMap<>();
            position++;
            skipWhitespace();
            if (peek() == '}') {
                position++;
                return object;
            }
            while (true) {
                skipWhitespace();
                if (peek() != '"') {
                    throw error("expected a string key");
                }
                String key = readString();
                skipWhitespace();
                if (peek() != ':') {
                    throw error("expected ':'");
                }
                position++;
                skipWhitespace();
                object.put(key, readValue());
                skipWhitespace();
                char next = peek();
                position++;
                if (next == '}') {
                    return object;
                }
                if (next != ',') {
                    throw error("expected ',' or '}'");
                }
            }
        }

        private List<Object> readArray() {
            List<Object> array = new ArrayList<>();
            position++;
            skipWhitespace();
            if (peek() == ']') {
                position++;
                return array;
            }
            while (true) {
                skipWhitespace();
                array.add(readValue());
                skipWhitespace();
                char next = peek();
                position++;
                if (next == ']') {
                    return array;
                }
                if (next != ',') {
                    throw error("expected ',' or ']'");
                }
            }
        }

        private char peek() {
            if (position >= text.length()) {
                throw error("unexpected end of input");
            }
            return text.charAt(position);
        }

        private String readString() {
            position++;
            StringBuilder out = new StringBuilder();
            while (true) {
                char current = peek();
                position++;
                if (current == '"') {
                    return out.toString();
                }
                if (current != '\\') {
                    out.append(current);
                    continue;
                }
                char escaped = peek();
                position++;
                switch (escaped) {
                    case '"':
                    case '\\':
                    case '/':
                        out.append(escaped);
                        break;
                    case 'b':
                        out.append('\b');
                        break;
                    case 'f':
                        out.append('\f');
                        break;
                    case 'n':
                        out.append('\n');
                        break;
                    case 'r':
                        out.append('\r');
                        break;
                    case 't':
                        out.append('\t');
                        break;
                    case 'u':
                        if (position + 4 > text.length()) {
                            throw error("truncated unicode escape");
                        }
                        out.append((char) Integer.parseInt(text.substring(position, position + 4), 16));
                        position += 4;
                        break;
                    default:
                        throw error("invalid escape '\\" + escaped + "'");
                }
            }
        }

        private Object readNumber() {
            int start = position;
            boolean integral = true;
            if (peek() == '-') {
                position++;
            }
            while (position < text.length()) {
                char current = text.charAt(position);
                if (current >= '0' && current <= '9') {
                    position++;
                } else if (current == '.' || current == 'e' || current == 'E' || current == '+' || current == '-') {
                    integral = false;
                    position++;
                } else {
                    break;
                }
            }
            String raw = text.substring(start, position);
            try {
                if (integral) {
                    return Long.parseLong(raw);
                }
                return Double.parseDouble(raw);
            } catch (NumberFormatException exception) {
                // Beyond a long: keep the value rather than fail the whole document.
                return Double.parseDouble(raw);
            }
        }

        private static void writeValue(StringBuilder out, Object value) {
            if (value == null) {
                out.append("null");
            } else if (value instanceof String string) {
                writeString(out, string);
            } else if (value instanceof Boolean || value instanceof Integer || value instanceof Long) {
                out.append(value);
            } else if (value instanceof Number number) {
                double asDouble = number.doubleValue();
                if (Double.isNaN(asDouble) || Double.isInfinite(asDouble)) {
                    out.append("null");
                } else if (asDouble == Math.rint(asDouble) && Math.abs(asDouble) < 1e15) {
                    out.append((long) asDouble);
                } else {
                    out.append(asDouble);
                }
            } else if (value instanceof Map<?, ?> map) {
                out.append('{');
                boolean first = true;
                for (Map.Entry<?, ?> entry : map.entrySet()) {
                    if (!first) {
                        out.append(',');
                    }
                    first = false;
                    writeString(out, String.valueOf(entry.getKey()));
                    out.append(':');
                    writeValue(out, entry.getValue());
                }
                out.append('}');
            } else if (value instanceof Iterable<?> items) {
                out.append('[');
                boolean first = true;
                for (Object item : items) {
                    if (!first) {
                        out.append(',');
                    }
                    first = false;
                    writeValue(out, item);
                }
                out.append(']');
            } else if (value instanceof JsonValue typed) {
                writeValue(out, typed.toJson());
            } else if (value instanceof WireValue wire) {
                writeValue(out, wire.wire());
            } else {
                // Dates and anything else print their ISO-8601 / text form.
                writeString(out, textValue(value));
            }
        }

        private static void writeString(StringBuilder out, String value) {
            out.append('"');
            for (int index = 0; index < value.length(); index++) {
                char current = value.charAt(index);
                switch (current) {
                    case '"':
                        out.append("\\\"");
                        break;
                    case '\\':
                        out.append("\\\\");
                        break;
                    case '\n':
                        out.append("\\n");
                        break;
                    case '\r':
                        out.append("\\r");
                        break;
                    case '\t':
                        out.append("\\t");
                        break;
                    default:
                        if (current < 0x20) {
                            out.append(String.format("\\u%04x", (int) current));
                        } else {
                            out.append(current);
                        }
                }
            }
            out.append('"');
        }
    }

    /** A generated model: serializes itself to the plain JSON graph. */
    public interface JsonValue {
        Object toJson();
    }

    /** A generated enum: carries the wire literal (a String or a Long) of each member. */
    public interface WireValue {
        Object wire();
    }

    // ─── Hydration helpers (wire value → typed value, null-tolerant) ───

    static String asString(Object value) {
        return value == null ? null : value instanceof String string ? string : String.valueOf(value);
    }

    static Long asLong(Object value) {
        if (value instanceof Number number) {
            return number.longValue();
        }
        return value instanceof String string && !string.isEmpty() ? Long.parseLong(string) : null;
    }

    static Double asDouble(Object value) {
        if (value instanceof Number number) {
            return number.doubleValue();
        }
        return value instanceof String string && !string.isEmpty() ? Double.parseDouble(string) : null;
    }

    static Boolean asBoolean(Object value) {
        if (value instanceof Boolean bool) {
            return bool;
        }
        return value instanceof String string ? Boolean.parseBoolean(string) : null;
    }

    static OffsetDateTime asOffsetDateTime(Object value) {
        return value == null ? null : OffsetDateTime.parse(asString(value));
    }

    static LocalDate asLocalDate(Object value) {
        return value == null ? null : LocalDate.parse(asString(value));
    }

    static <T> List<T> asList(Object value, Function<Object, T> item) {
        if (!(value instanceof List<?> raw)) {
            return null;
        }
        List<T> out = new ArrayList<>(raw.size());
        for (Object entry : raw) {
            out.add(item.apply(entry));
        }
        return out;
    }

    static <T> Map<String, T> asMap(Object value, Function<Object, T> item) {
        if (!(value instanceof Map<?, ?> raw)) {
            return null;
        }
        Map<String, T> out = new LinkedHashMap<>();
        for (Map.Entry<?, ?> entry : raw.entrySet()) {
            out.put(String.valueOf(entry.getKey()), item.apply(entry.getValue()));
        }
        return out;
    }

    static Map<String, Object> asObject(Object value) {
        return asMap(value, item -> item);
    }

    static <T> List<Object> mapList(List<T> value, Function<T, Object> item) {
        if (value == null) {
            return null;
        }
        List<Object> out = new ArrayList<>(value.size());
        for (T entry : value) {
            out.add(entry == null ? null : item.apply(entry));
        }
        return out;
    }

    static <T> Map<String, Object> mapValues(Map<String, T> value, Function<T, Object> item) {
        if (value == null) {
            return null;
        }
        Map<String, Object> out = new LinkedHashMap<>();
        for (Map.Entry<String, T> entry : value.entrySet()) {
            out.put(entry.getKey(), entry.getValue() == null ? null : item.apply(entry.getValue()));
        }
        return out;
    }

    /** The wire text of a typed value: enums by wire literal, date-times with seconds, records as JSON, the rest as text. */
    static String textValue(Object value) {
        if (value instanceof WireValue wire) {
            return String.valueOf(wire.wire());
        }
        if (value instanceof JsonValue || value instanceof Map || value instanceof Iterable) {
            return Json.write(value);
        }
        if (value instanceof OffsetDateTime dateTime) {
            return dateTime.format(DateTimeFormatter.ISO_OFFSET_DATE_TIME);
        }
        return String.valueOf(value);
    }

    static void addQuery(Map<String, List<String>> query, String name, Object value) {
        query.computeIfAbsent(name, key -> new ArrayList<>()).add(textValue(value));
    }

    /** The source's elements, each mapped — the typed view of a raw page or item sequence. */
    static <T> Iterable<T> mapIterable(Iterable<Object> source, Function<Object, T> map) {
        return () -> {
            Iterator<Object> raw = source.iterator();
            return new Iterator<T>() {
                @Override
                public boolean hasNext() {
                    return raw.hasNext();
                }

                @Override
                public T next() {
                    return map.apply(raw.next());
                }
            };
        };
    }

    /** The items of every page, in order, read through the rule's `items` pointer. */
    static Iterable<Object> flattenItems(Iterable<Object> pages, String pointer) {
        return () -> {
            Iterator<Object> pageIterator = pages.iterator();
            return new Iterator<Object>() {
                private Iterator<?> items = Collections.emptyIterator();

                @Override
                public boolean hasNext() {
                    while (!items.hasNext()) {
                        if (!pageIterator.hasNext()) {
                            return false;
                        }
                        Object found = resolvePointer(pageIterator.next(), pointer);
                        items = found instanceof List<?> list ? list.iterator() : Collections.emptyIterator();
                    }
                    return true;
                }

                @Override
                public Object next() {
                    if (!hasNext()) {
                        throw new NoSuchElementException();
                    }
                    return items.next();
                }
            };
        };
    }

    static Map<String, List<String>> cloneQuery(Map<String, List<String>> query) {
        Map<String, List<String>> out = new LinkedHashMap<>();
        for (Map.Entry<String, List<String>> entry : query.entrySet()) {
            out.put(entry.getKey(), new ArrayList<>(entry.getValue()));
        }
        return out;
    }

    // ─── Auth and URLs ───

    record ResolvedAuth(Map<String, String> headers, Map<String, List<String>> query) {}

    private static boolean schemeConfigured(SecuritySpec spec, Auth auth) {
        switch (spec.kind()) {
            case "apiKey":
                return auth.apiKey.containsKey(spec.scheme());
            case "bearer":
                return auth.bearer != null;
            default:
                return auth.basic != null;
        }
    }

    /**
     * Apply the first fully-configured OR-alternative; when none is, the first alternative's
     * configured schemes are still sent (the server rejects the request — same behavior as
     * the TypeScript runtime).
     */
    static ResolvedAuth resolveAuth(List<List<SecuritySpec>> security, Auth auth) {
        Map<String, String> headers = new LinkedHashMap<>();
        Map<String, List<String>> query = new LinkedHashMap<>();
        if (security == null || security.isEmpty()) {
            return new ResolvedAuth(headers, query);
        }
        List<SecuritySpec> alternative = security.get(0);
        for (List<SecuritySpec> candidate : security) {
            boolean all = true;
            for (SecuritySpec spec : candidate) {
                if (!schemeConfigured(spec, auth)) {
                    all = false;
                    break;
                }
            }
            if (all) {
                alternative = candidate;
                break;
            }
        }
        List<String> cookies = new ArrayList<>();
        for (SecuritySpec spec : alternative) {
            switch (spec.kind()) {
                case "apiKey": {
                    Supplier<String> provider = auth.apiKey.get(spec.scheme());
                    if (provider == null) {
                        continue;
                    }
                    String value = provider.get();
                    if ("query".equals(spec.in())) {
                        addQuery(query, spec.name(), value);
                    } else if ("cookie".equals(spec.in())) {
                        cookies.add(spec.name() + "=" + encode(value));
                    } else {
                        headers.put(spec.name(), value);
                    }
                    break;
                }
                case "bearer":
                    if (auth.bearer != null) {
                        headers.put("Authorization", "Bearer " + auth.bearer.get());
                    }
                    break;
                default:
                    if (auth.basic != null) {
                        String token = auth.basic.username() + ":" + auth.basic.password();
                        headers.put(
                            "Authorization",
                            "Basic " + Base64.getEncoder().encodeToString(token.getBytes(StandardCharsets.UTF_8))
                        );
                    }
            }
        }
        if (!cookies.isEmpty()) {
            headers.put("Cookie", String.join("; ", cookies));
        }
        return new ResolvedAuth(headers, query);
    }

    /** Percent-encode one path segment or query component. */
    static String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8).replace("+", "%20");
    }

    /** Substitute `{param}` placeholders with encoded values and prefix the server URL. */
    static String buildUrl(String serverUrl, String path, Map<String, String> pathParams) {
        String filled = path;
        for (Map.Entry<String, String> entry : pathParams.entrySet()) {
            filled = filled.replace("{" + entry.getKey() + "}", encode(entry.getValue()));
        }
        String base = serverUrl;
        while (base.endsWith("/")) {
            base = base.substring(0, base.length() - 1);
        }
        return base + filled;
    }

    /** Append query params in form style: a list value repeats the key (`tag=a&tag=b`). */
    static String appendQuery(String url, Map<String, List<String>> query) {
        StringBuilder pairs = new StringBuilder();
        for (Map.Entry<String, List<String>> entry : query.entrySet()) {
            for (String value : entry.getValue()) {
                if (pairs.length() > 0) {
                    pairs.append('&');
                }
                pairs.append(encode(entry.getKey())).append('=').append(encode(value));
            }
        }
        if (pairs.length() == 0) {
            return url;
        }
        return url + (url.contains("?") ? "&" : "?") + pairs;
    }

    // ─── Send ───

    /** One request as the generated methods describe it; the runtime adds auth, retries, and middleware. */
    static final class RequestSpec {
        String operationId;
        String method;
        String url;
        Map<String, String> headers = new LinkedHashMap<>();
        Map<String, List<String>> query = new LinkedHashMap<>();
        /** `byte[]` is replayable across attempts; an `InputStream` is sent as is, once. */
        Object body;
        String contentType;

        RequestSpec(String operationId, String method, String url) {
            this.operationId = operationId;
            this.method = method;
            this.url = url;
        }

        RequestSpec headers(Map<String, String> headers) {
            this.headers = headers;
            return this;
        }

        RequestSpec query(Map<String, List<String>> query) {
            this.query = query;
            return this;
        }

        RequestSpec body(Object body, String contentType) {
            this.body = body;
            this.contentType = contentType;
            return this;
        }
    }

    private static final List<Integer> TRANSIENT_STATUS = List.of(408, 429, 500, 502, 503, 504);

    private static boolean defaultRetryOn(String method, Map<String, String> headers, HttpResponse<?> response, Exception error) {
        boolean safe = List.of("GET", "HEAD", "PUT", "DELETE", "OPTIONS").contains(method) || hasHeader(headers, "Idempotency-Key");
        if (!safe) {
            return false;
        }
        if (error != null) {
            return true;
        }
        return response != null && TRANSIENT_STATUS.contains(response.statusCode());
    }

    private static boolean hasHeader(Map<String, String> headers, String name) {
        for (String key : headers.keySet()) {
            if (key.equalsIgnoreCase(name)) {
                return true;
            }
        }
        return false;
    }

    private static Duration retryDelay(Retry retry, int attempt, String retryAfter) {
        if (retryAfter != null) {
            try {
                return Duration.ofMillis((long) (Double.parseDouble(retryAfter.trim()) * 1000));
            } catch (NumberFormatException ignored) {
                // An HTTP-date Retry-After falls back to the policy's own delay.
            }
        }
        Duration raw = "fixed".equals(retry.strategy) ? retry.delay : retry.delay.multipliedBy(1L << (attempt - 1));
        if (retry.noJitter) {
            return raw;
        }
        return Duration.ofMillis(ThreadLocalRandom.current().nextLong(raw.toMillis() + 1));
    }

    private static void sleep(Duration delay) {
        try {
            Thread.sleep(Math.max(0, delay.toMillis()));
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
            throw new UncheckedIOException(new IOException("Interrupted while waiting to retry", interrupted));
        }
    }

    /**
     * The request core: header merge, idempotency keys, the retry loop with a fresh timeout
     * per attempt, and the middleware hooks. Returns the response of the last attempt with
     * its body still unread; callers map status >= 400 to ApiException.
     */
    static HttpResponse<InputStream> send(Config config, RequestSpec spec) {
        Map<String, String> headers = new LinkedHashMap<>(config.headers);
        headers.putAll(spec.headers);
        headers.put("X-Redocly-Client", config.clientHeader);
        String method = spec.method.toUpperCase(Locale.ROOT);
        if ((method.equals("POST") || method.equals("PATCH")) && !hasHeader(headers, "Idempotency-Key") && config.idempotencyKey != null) {
            headers.put("Idempotency-Key", config.idempotencyKey.get());
        }
        if (spec.contentType != null && spec.body != null && !hasHeader(headers, "Content-Type")) {
            headers.put("Content-Type", spec.contentType);
        }
        if (config.httpClient == null) {
            // HTTP/1.1 outright: the default client's h2c upgrade attempt confuses servers that
            // do not speak HTTP/2, and a generated SDK cannot know which it will meet.
            config.httpClient = HttpClient.newBuilder().version(HttpClient.Version.HTTP_1_1).build();
        }
        HttpClient httpClient = config.httpClient;
        String fullUrl = appendQuery(spec.url, spec.query);
        boolean stream = spec.body instanceof InputStream;
        // The first attempt consumes a stream, so there is nothing to replay.
        int maxAttempts = stream ? 1 : 1 + Math.max(0, config.retry.retries);
        for (int attempt = 1; ; attempt++) {
            HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create(fullUrl));
            if (config.timeout != null) {
                builder.timeout(config.timeout);
            }
            for (Map.Entry<String, String> entry : headers.entrySet()) {
                builder.header(entry.getKey(), entry.getValue());
            }
            HttpRequest.BodyPublisher publisher;
            if (spec.body instanceof InputStream input) {
                publisher = HttpRequest.BodyPublishers.ofInputStream(() -> input);
            } else if (spec.body instanceof byte[] bytes) {
                publisher = HttpRequest.BodyPublishers.ofByteArray(bytes);
            } else {
                publisher = HttpRequest.BodyPublishers.noBody();
            }
            builder.method(method, publisher);
            for (Middleware middleware : config.middleware) {
                middleware.onRequest(builder);
            }
            HttpResponse<InputStream> response = null;
            Exception failure = null;
            try {
                response = httpClient.send(builder.build(), HttpResponse.BodyHandlers.ofInputStream());
            } catch (IOException | InterruptedException exception) {
                if (exception instanceof InterruptedException) {
                    Thread.currentThread().interrupt();
                }
                failure = exception;
            }
            boolean retryable = config.retry.retryOn != null
                ? config.retry.retryOn.test(attempt, response, failure)
                : defaultRetryOn(method, headers, response, failure);
            if (failure != null) {
                if (attempt < maxAttempts && retryable) {
                    sleep(retryDelay(config.retry, attempt, null));
                    continue;
                }
                if (failure instanceof HttpTimeoutException) {
                    throw new ApiTimeoutException(spec.operationId, config.timeout, attempt);
                }
                throw new UncheckedIOException("Request to " + fullUrl + " failed: " + failure.getMessage(), new IOException(failure));
            }
            for (int index = config.middleware.size() - 1; index >= 0; index--) {
                config.middleware.get(index).onResponse(response);
            }
            if (response.statusCode() >= 400 && attempt < maxAttempts && retryable) {
                String retryAfter = response.headers().firstValue("Retry-After").orElse(null);
                readBody(response);
                sleep(retryDelay(config.retry, attempt, retryAfter));
                continue;
            }
            return response;
        }
    }

    /** The whole response body; the stream is closed afterwards. */
    static byte[] readBody(HttpResponse<InputStream> response) {
        try (InputStream body = response.body()) {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] chunk = new byte[8192];
            int read;
            while ((read = body.read(chunk)) != -1) {
                out.write(chunk, 0, read);
            }
            return out.toByteArray();
        } catch (IOException exception) {
            throw new UncheckedIOException(exception);
        }
    }

    /** The decoded JSON body, or null for an empty body. */
    static Object decodeJson(HttpResponse<InputStream> response) {
        String text = new String(readBody(response), StandardCharsets.UTF_8);
        return text.isBlank() ? null : Json.parse(text);
    }

    /** The structured exception for a non-2xx response; the body is decoded when it is JSON. */
    static ApiException apiErrorFrom(HttpResponse<InputStream> response, String url) {
        String text = new String(readBody(response), StandardCharsets.UTF_8);
        Object body = text;
        if (!text.isBlank()) {
            try {
                body = Json.parse(text);
            } catch (IllegalArgumentException notJson) {
                body = text;
            }
        }
        return new ApiException(url, response.statusCode(), body);
    }

    /** Coerce declared response headers per `{name, key, type}` specs; absent or unparsable ones are omitted. */
    static Map<String, Object> readEnvelopeHeaders(HttpResponse<?> response, String[][] specs) {
        Map<String, Object> headers = new LinkedHashMap<>();
        for (String[] spec : specs) {
            String raw = response.headers().firstValue(spec[0]).orElse(null);
            if (raw == null) {
                continue;
            }
            String trimmed = raw.trim();
            try {
                switch (spec[2]) {
                    case "integer":
                        headers.put(spec[1], Long.parseLong(trimmed));
                        break;
                    case "number":
                        headers.put(spec[1], Double.parseDouble(trimmed));
                        break;
                    case "boolean": {
                        String lower = trimmed.toLowerCase(Locale.ROOT);
                        if (lower.equals("true") || lower.equals("false")) {
                            headers.put(spec[1], lower.equals("true"));
                        }
                        break;
                    }
                    default:
                        headers.put(spec[1], raw);
                }
            } catch (NumberFormatException unparsable) {
                // Omitted, like an absent header.
            }
        }
        return headers;
    }

    // ─── Pagination ───

    /** Walk an RFC 6901 JSON pointer over decoded JSON; null on any miss. */
    static Object resolvePointer(Object data, String pointer) {
        if (pointer == null || pointer.isEmpty()) {
            return data;
        }
        if (!pointer.startsWith("/")) {
            return null;
        }
        Object current = data;
        for (String token : pointer.substring(1).split("/", -1)) {
            String key = token.replace("~1", "/").replace("~0", "~");
            if (current instanceof Map<?, ?> map) {
                current = map.get(key);
            } else if (current instanceof List<?> list) {
                try {
                    int index = Integer.parseInt(key);
                    current = index >= 0 && index < list.size() ? list.get(index) : null;
                } catch (NumberFormatException notAnIndex) {
                    return null;
                }
            } else {
                return null;
            }
            if (current == null) {
                return null;
            }
        }
        return current;
    }

    /** The `rel="next"` target of a `Link` header, or null. */
    static String linkNext(String header) {
        if (header == null) {
            return null;
        }
        for (String entry : header.split(",")) {
            String[] parts = entry.split(";");
            if (parts.length < 2) {
                continue;
            }
            String target = parts[0].trim();
            if (!target.startsWith("<") || !target.endsWith(">")) {
                continue;
            }
            for (int index = 1; index < parts.length; index++) {
                String param = parts[index].trim();
                if (param.startsWith("rel=")) {
                    String rel = param.substring(4).replace("\"", "");
                    for (String kind : rel.split("\\s+")) {
                        if (kind.equals("next")) {
                            return target.substring(1, target.length() - 1);
                        }
                    }
                }
            }
        }
        return null;
    }

    /** One page fetch: the decoded page and the response it came from. */
    record PageResult(Object page, HttpResponse<InputStream> response) {}

    @FunctionalInterface
    interface PageCall {
        PageResult call(Map<String, List<String>> params);
    }

    /** An iterator that fetches its next element lazily, once per `hasNext`. */
    abstract static class LazyIterator<T> implements Iterator<T> {
        private T next;
        private boolean ready;
        private boolean done;

        /** The next element, or null when the sequence has ended. */
        protected abstract T fetch();

        @Override
        public boolean hasNext() {
            if (done) {
                return false;
            }
            if (!ready) {
                next = fetch();
                ready = true;
                if (next == null) {
                    done = true;
                }
            }
            return !done;
        }

        @Override
        public T next() {
            if (!hasNext()) {
                throw new NoSuchElementException();
            }
            ready = false;
            return next;
        }
    }

    /**
     * Auto-pagination over raw decoded pages, following the rule in `spec` — the same stop
     * conditions and loop guards as the TypeScript runtime. Generated wrappers hydrate the
     * pages into models.
     */
    static Iterable<Object> iterPages(PageCall call, PaginationSpec spec, Map<String, List<String>> base) {
        return () -> new LazyIterator<>() {
            private boolean started;
            private boolean finished;
            private Object cursor;
            private Map<String, List<String>> params = cloneQuery(base);
            private String previousLink;
            private String previousItems;
            private int position;

            @Override
            protected Object fetch() {
                if (finished) {
                    return null;
                }
                switch (spec.style()) {
                    case "cursor":
                        return fetchCursor();
                    case "link":
                    case "body-link":
                        return fetchLink();
                    default:
                        return fetchOffset();
                }
            }

            private Object fetchCursor() {
                if (!started) {
                    started = true;
                    List<String> seed = base.get(spec.param());
                    cursor = seed == null || seed.isEmpty() ? null : seed.get(0);
                }
                Map<String, List<String>> pageParams = cloneQuery(base);
                if (cursor != null) {
                    pageParams.put(spec.param(), new ArrayList<>(List.of(String.valueOf(cursor))));
                }
                Object page = call.call(pageParams).page();
                if (spec.hasMore() != null && Boolean.FALSE.equals(resolvePointer(page, spec.hasMore()))) {
                    finished = true;
                    return page;
                }
                Object next = resolvePointer(page, spec.nextCursor());
                if (next == null || "".equals(next)) {
                    finished = true;
                    return page;
                }
                if (!(next instanceof String) && !(next instanceof Number)) {
                    throw new IllegalStateException("Pagination cursor at " + spec.nextCursor() + " is not a string or number");
                }
                if (cursor != null && String.valueOf(next).equals(String.valueOf(cursor))) {
                    throw new IllegalStateException("Pagination did not advance: the operation returned the same cursor twice");
                }
                cursor = next;
                return page;
            }

            private Object fetchLink() {
                PageResult result = call.call(params);
                String target;
                if (spec.style().equals("link")) {
                    target = linkNext(result.response().headers().firstValue("Link").orElse(null));
                } else {
                    Object value = resolvePointer(result.page(), spec.nextLink());
                    if (value != null && !(value instanceof String)) {
                        throw new IllegalStateException("Pagination link at " + spec.nextLink() + " is not a string");
                    }
                    target = (String) value;
                }
                if (target == null || target.isEmpty()) {
                    finished = true;
                    return result.page();
                }
                URI pageUri = result.response().uri();
                URI next = pageUri.resolve(target);
                if (next.toString().equals(previousLink) || next.toString().equals(pageUri.toString())) {
                    throw new IllegalStateException("Pagination did not advance: the Link rel=\"next\" target repeats");
                }
                previousLink = next.toString();
                params = cloneQuery(base);
                String rawQuery = next.getRawQuery();
                if (rawQuery != null) {
                    for (String pair : rawQuery.split("&")) {
                        if (pair.isEmpty()) {
                            continue;
                        }
                        int equals = pair.indexOf('=');
                        String key = java.net.URLDecoder.decode(equals < 0 ? pair : pair.substring(0, equals), StandardCharsets.UTF_8);
                        String value = equals < 0 ? "" : java.net.URLDecoder.decode(pair.substring(equals + 1), StandardCharsets.UTF_8);
                        params.put(key, new ArrayList<>(List.of(value)));
                    }
                }
                return result.page();
            }

            private Object fetchOffset() {
                if (!started) {
                    started = true;
                    position = spec.style().equals("page") ? 1 : 0;
                    List<String> seed = base.get(spec.param());
                    if (seed != null && !seed.isEmpty() && !seed.get(0).isEmpty()) {
                        try {
                            position = Integer.parseInt(seed.get(0));
                        } catch (NumberFormatException ignored) {
                            // The description's default position stands.
                        }
                    }
                }
                Map<String, List<String>> pageParams = cloneQuery(base);
                pageParams.put(spec.param(), new ArrayList<>(List.of(String.valueOf(position))));
                Object page = call.call(pageParams).page();
                Object items = resolvePointer(page, spec.items());
                List<?> list = items instanceof List<?> found ? found : null;
                if (list != null) {
                    String serialized = Json.write(list);
                    if (serialized.equals(previousItems)) {
                        throw new IllegalStateException("Pagination did not advance: the operation returned the same page twice");
                    }
                    previousItems = serialized;
                }
                if (list == null || list.isEmpty()) {
                    finished = true;
                    return page;
                }
                position += spec.style().equals("page") ? 1 : list.size();
                return page;
            }
        };
    }

    // ─── Server-Sent Events ───

    @FunctionalInterface
    interface SseOpener {
        HttpResponse<InputStream> open(Map<String, String> extraHeaders);
    }

    private static ServerSentEvent parseSseFrame(String raw, boolean jsonData) {
        String event = "message";
        List<String> dataLines = new ArrayList<>();
        String id = null;
        Integer retry = null;
        boolean sawField = false;
        for (String line : raw.replace("\r\n", "\n").replace('\r', '\n').split("\n")) {
            if (line.isEmpty() || line.startsWith(":")) {
                continue;
            }
            int colon = line.indexOf(':');
            String field = colon < 0 ? line : line.substring(0, colon);
            String value = colon < 0 ? "" : line.substring(colon + 1);
            if (value.startsWith(" ")) {
                value = value.substring(1);
            }
            sawField = true;
            switch (field) {
                case "event":
                    event = value;
                    break;
                case "data":
                    dataLines.add(value);
                    break;
                case "id":
                    id = value;
                    break;
                case "retry":
                    try {
                        retry = Integer.valueOf(value);
                    } catch (NumberFormatException ignored) {
                        // A non-numeric retry field is ignored, as the spec says.
                    }
                    break;
                default:
            }
        }
        if (!sawField) {
            return null;
        }
        String text = String.join("\n", dataLines);
        Object data = jsonData && !text.isEmpty() ? Json.parse(text) : text;
        return new ServerSentEvent(event, data, id, retry);
    }

    /**
     * Stream server-sent events, reconnecting with `Last-Event-ID` on a dropped connection
     * (a fresh open = fresh auth); a 4xx/5xx or a bad JSON payload ends the stream with an
     * exception, a clean end of stream ends it quietly.
     */
    static Iterable<ServerSentEvent> iterSse(SseOpener open, boolean jsonData) {
        return () -> new LazyIterator<>() {
            private InputStream body;
            private final StringBuilder buffer = new StringBuilder();
            private final byte[] chunk = new byte[4096];
            private String lastEventId;
            private int serverRetry = -1;
            private int failures;
            private boolean finished;

            private void connect() {
                Map<String, String> headers = new LinkedHashMap<>();
                headers.put("Accept", "text/event-stream");
                if (lastEventId != null) {
                    headers.put("Last-Event-ID", lastEventId);
                }
                HttpResponse<InputStream> response = open.open(headers);
                if (response.statusCode() >= 400) {
                    throw apiErrorFrom(response, response.uri().toString());
                }
                body = response.body();
                failures = 0;
            }

            private void backoff() {
                failures++;
                long base = serverRetry >= 0 ? serverRetry : 1000;
                long delay = Math.min(base * (1L << (failures - 1)), 30_000);
                sleep(Duration.ofMillis(ThreadLocalRandom.current().nextLong(delay + 1)));
            }

            private ServerSentEvent take(String frame) {
                ServerSentEvent event = parseSseFrame(frame, jsonData);
                if (event == null) {
                    return null;
                }
                if (event.id() != null) {
                    lastEventId = event.id();
                }
                if (event.retry() != null && event.retry() >= 0) {
                    serverRetry = event.retry();
                }
                return event;
            }

            @Override
            protected ServerSentEvent fetch() {
                while (!finished) {
                    if (body == null) {
                        try {
                            connect();
                        } catch (UncheckedIOException dropped) {
                            backoff();
                            continue;
                        }
                    }
                    int split = buffer.indexOf("\n\n");
                    if (split >= 0) {
                        String frame = buffer.substring(0, split);
                        buffer.delete(0, split + 2);
                        ServerSentEvent event = take(frame);
                        if (event != null) {
                            return event;
                        }
                        continue;
                    }
                    int read;
                    try {
                        read = body.read(chunk);
                    } catch (IOException dropped) {
                        read = -2;
                    }
                    if (read >= 0) {
                        buffer.append(new String(chunk, 0, read, StandardCharsets.UTF_8).replace("\r\n", "\n").replace('\r', '\n'));
                        continue;
                    }
                    try {
                        body.close();
                    } catch (IOException ignored) {
                        // The connection is gone either way.
                    }
                    body = null;
                    if (read == -1) {
                        finished = true;
                        String rest = buffer.toString();
                        buffer.setLength(0);
                        return rest.isBlank() ? null : take(rest);
                    }
                    backoff();
                }
                return null;
            }
        };
    }

    // ─── Request bodies ───

    /** A prepared request body: the bytes or stream to send and the content type to declare, if any. */
    record Body(Object body, String contentType) {}

    /** Encode a map as `multipart/form-data`; nested values become JSON parts. */
    static Body toMultipart(Map<String, Object> fields) {
        String boundary = "redocly-" + Long.toHexString(ThreadLocalRandom.current().nextLong()) + Long.toHexString(ThreadLocalRandom.current().nextLong());
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try {
            for (Map.Entry<String, Object> entry : fields.entrySet()) {
                Object value = entry.getValue();
                if (value == null) {
                    continue;
                }
                out.write(("--" + boundary + "\r\n").getBytes(StandardCharsets.UTF_8));
                if (value instanceof byte[] bytes) {
                    out.write(("Content-Disposition: form-data; name=\"" + entry.getKey() + "\"; filename=\"" + entry.getKey() + "\"\r\nContent-Type: application/octet-stream\r\n\r\n").getBytes(StandardCharsets.UTF_8));
                    out.write(bytes);
                } else if (value instanceof String || value instanceof Number || value instanceof Boolean || value instanceof WireValue) {
                    out.write(("Content-Disposition: form-data; name=\"" + entry.getKey() + "\"\r\n\r\n").getBytes(StandardCharsets.UTF_8));
                    out.write(textValue(value).getBytes(StandardCharsets.UTF_8));
                } else {
                    out.write(("Content-Disposition: form-data; name=\"" + entry.getKey() + "\"\r\nContent-Type: application/json\r\n\r\n").getBytes(StandardCharsets.UTF_8));
                    out.write(Json.write(value).getBytes(StandardCharsets.UTF_8));
                }
                out.write("\r\n".getBytes(StandardCharsets.UTF_8));
            }
            out.write(("--" + boundary + "--\r\n").getBytes(StandardCharsets.UTF_8));
        } catch (IOException exception) {
            throw new UncheckedIOException(exception);
        }
        return new Body(out.toByteArray(), "multipart/form-data; boundary=" + boundary);
    }

    /**
     * The body of an untyped multipart operation: an InputStream is streamed and a `byte[]`
     * or String sent as is, all under the caller's Content-Type (the boundary is theirs to
     * set); a map is encoded with `toMultipart`.
     */
    static Body multipartBody(Object body) {
        if (body instanceof InputStream || body instanceof byte[]) {
            return new Body(body, null);
        }
        if (body instanceof String text) {
            return new Body(text.getBytes(StandardCharsets.UTF_8), null);
        }
        return toMultipart(asObject(body instanceof JsonValue typed ? typed.toJson() : body));
    }

    /** The body of a binary operation: an InputStream is streamed, a `byte[]` or String sent as is, anything else JSON-encoded. */
    static Body binaryBody(Object body, String contentType) {
        if (body instanceof InputStream || body instanceof byte[]) {
            return new Body(body, contentType);
        }
        if (body instanceof String text) {
            return new Body(text.getBytes(StandardCharsets.UTF_8), contentType);
        }
        return new Body(Json.write(body).getBytes(StandardCharsets.UTF_8), contentType);
    }

    /** A JSON request body from a typed value. */
    static Body jsonBody(Object body, String contentType) {
        Object plain = body instanceof JsonValue typed ? typed.toJson() : body;
        return new Body(Json.write(plain).getBytes(StandardCharsets.UTF_8), contentType);
    }

    static Map<String, String> pathParams(String... pairs) {
        Map<String, String> out = new LinkedHashMap<>();
        for (int index = 0; index + 1 < pairs.length; index += 2) {
            out.put(pairs[index], Objects.requireNonNull(pairs[index + 1], "path parameter " + pairs[index]));
        }
        return out;
    }
}
