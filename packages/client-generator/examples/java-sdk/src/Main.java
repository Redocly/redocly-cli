// Consume the generated Java SDK: records over java.net.http, no dependencies.
import redoclycafe.Client;

public final class Main {
    public static void main(String[] args) {
        Client client = new Client();
        Client.MenuItemList menu = client.listMenuItems(new Client.ListMenuItemsParams().limit(3L));
        for (Client.MenuItem item : menu.items()) {
            if (item instanceof Client.Beverage beverage) {
                System.out.println(beverage.name());
            } else if (item instanceof Client.Dessert dessert) {
                System.out.println(dessert.name());
            }
        }
    }
}
