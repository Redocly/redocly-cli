# URL assembly for generated Python clients — path-parameter substitution with
# percent-encoding, mirroring the TypeScript runtime's url.ts semantics.
from __future__ import annotations

from typing import Any, Dict
from urllib.parse import quote


def build_url(server_url: str, path: str, path_params: Dict[str, Any]) -> str:
    filled = path
    for name, value in path_params.items():
        filled = filled.replace("{" + name + "}", quote(str(value), safe=""))
    return server_url.rstrip("/") + filled
