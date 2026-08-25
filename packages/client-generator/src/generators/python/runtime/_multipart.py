# Multipart bodies for generated Python clients — a typed dict/dataclass body is
# split into httpx's (data, files): bytes and file-like values upload as parts,
# everything else is form data (nested values JSON-encoded, mirroring the
# TypeScript runtime's FormData serialization).
from __future__ import annotations

import json
from typing import Any, Dict, Tuple

from ._decode import encode


def to_multipart(body: Any) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    wire = encode(body)
    data: Dict[str, Any] = {}
    files: Dict[str, Any] = {}
    for key, value in (wire or {}).items():
        if isinstance(value, (bytes, bytearray)) or hasattr(value, "read"):
            files[key] = value
        elif isinstance(value, (dict, list)):
            data[key] = json.dumps(value)
        else:
            data[key] = value
    return data, files
