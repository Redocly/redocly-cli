# Consume the generated Python SDK: typed dataclasses over httpx.
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "api"))

from client import Client

client = Client()
menu = client.list_menu_items(limit=3)
for item in menu.items:
    print(item.name)
