# Pages through an operation under a path parameter in the generated Python SDK. Run by
# python/client.test.ts with:
#   python3 paginate_path_param.py <folder-with-generated-client.py> <server-base-url>
import sys

sys.path.insert(0, sys.argv[1])
import client

pages = list(client.Client(server_url=sys.argv[2]).list_order_items_pages("ord_7"))
assert len(pages) == 2, pages

print("PYTHON_PAGE_PATH_OK")
