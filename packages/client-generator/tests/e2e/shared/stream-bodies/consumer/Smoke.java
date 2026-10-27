// Runtime smoke for stream request bodies in the generated Java SDK. Compiled and run by
// java/stream-bodies.test.ts with the echo server's base URL as the only argument. It
// only makes the calls, in a fixed order; the test reads what the server received.

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import streambodies.Client;

public final class Smoke {
    private static final String MULTIPART =
        "--redocly\r\nContent-Disposition: form-data; name=\"note\"\r\n\r\nhello stream\r\n--redocly--\r\n";

    private static byte[] allBytes() {
        byte[] payload = new byte[256];
        for (int index = 0; index < payload.length; index++) {
            payload[index] = (byte) index;
        }
        return payload;
    }

    private static void expectUnavailable(Runnable call) {
        try {
            call.run();
        } catch (Client.ApiException error) {
            if (error.status == 503) {
                return;
            }
            throw new IllegalStateException("expected a 503 ApiException, got " + error.status);
        }
        throw new IllegalStateException("expected a 503 ApiException");
    }

    public static void main(String[] args) {
        String serverUrl = args[0];
        byte[] binary = allBytes();
        Client api = new Client(
            new Client.Config()
                .serverUrl(serverUrl)
                .retry(
                    new Client.Retry()
                        .retries(2)
                        .delay(Duration.ofMillis(1))
                        .retryOn((attempt, response, error) -> true)
                )
        );

        // Streams: the body passes through untouched and is sent once, even under /fail/.
        api.upload(new ByteArrayInputStream(MULTIPART.getBytes(StandardCharsets.UTF_8)));
        api.uploadBlob("declared", new ByteArrayInputStream(binary));
        expectUnavailable(() -> api.uploadFailing("stream", new ByteArrayInputStream(binary)));

        // Replayable bodies: the caller's Content-Type wins, and the retry policy still applies.
        // Headers are per client in Java, so the caller's Content-Type comes from a second one.
        Client custom = new Client(
            new Client.Config().serverUrl(serverUrl).header("content-type", "application/x-custom")
        );
        custom.uploadBlob("custom", binary);
        expectUnavailable(() -> api.uploadFailing("bytes", binary));

        System.out.println("JAVA_SMOKE_OK");
    }
}
