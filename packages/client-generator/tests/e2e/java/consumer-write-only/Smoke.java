// Runtime check for write-only properties in the generated Java SDK. Compiled and run by
// java/write-only.test.ts with the server base URL as the only argument. The request sends
// the password; the response comes back without it and must still hydrate.

import cafecustomers.Client;

public final class Smoke {
    public static void main(String[] args) {
        Client client = new Client(new Client.Config().serverUrl(args[0]));
        Client.Customer customer = client.createCustomer(
            new Client.Customer(null, "ada@example.com", "correct horse")
        );
        if (customer.password() != null) {
            throw new IllegalStateException("expected no password, got " + customer.password());
        }
        if (!"ada@example.com".equals(customer.email())) {
            throw new IllegalStateException("expected the email to hydrate, got " + customer.email());
        }

        System.out.println("JAVA_SMOKE_OK");
    }
}
