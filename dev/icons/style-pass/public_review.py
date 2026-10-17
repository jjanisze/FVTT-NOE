"""Keep local reference locations out of public review metadata."""
import hashlib
import json
import re


def public_copy(value):
    if isinstance(value, str):
        return re.sub(r"(?i)\b[a-z]:[\\/][^\r\n]*?(?=\s+-\s+|$)", "[local reference]", value)
    if isinstance(value, dict):
        return {key: public_copy(item) for key, item in value.items()}
    if isinstance(value, list):
        return [public_copy(item) for item in value]
    return value


def feedback_hash(value):
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, sort_keys=True).encode("utf-8")).hexdigest()
